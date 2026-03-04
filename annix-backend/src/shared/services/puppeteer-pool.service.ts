import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";

export interface PdfOptions {
  format?: "A4" | "Letter";
  width?: string;
  height?: string;
  printBackground?: boolean;
  margin?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
}

export interface PageTask<T> {
  execute: (page: import("puppeteer").Page) => Promise<T>;
  url?: string;
  waitUntil?: "load" | "domcontentloaded" | "networkidle0" | "networkidle2";
  timeout?: number;
}

interface QueuedTask<T> {
  task: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

@Injectable()
export class PuppeteerPoolService implements OnModuleDestroy {
  private readonly logger = new Logger(PuppeteerPoolService.name);
  private browser: import("puppeteer").Browser | null = null;
  private browserPromise: Promise<import("puppeteer").Browser> | null = null;
  private idleTimeout: NodeJS.Timeout | null = null;
  private readonly idleTimeoutMs = 5 * 60 * 1000;
  private activeTaskCount = 0;
  private readonly maxConcurrent = 2;
  private readonly taskQueue: QueuedTask<unknown>[] = [];
  private isProcessingQueue = false;

  private readonly defaultArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-extensions",
    "--disable-software-rasterizer",
    "--single-process",
    "--no-zygote",
    "--disable-features=VizDisplayCompositor",
    "--disable-background-networking",
    "--disable-default-apps",
    "--disable-sync",
    "--js-flags=--max-old-space-size=128",
  ];

  async onModuleDestroy(): Promise<void> {
    await this.closeBrowser();
  }

  async generatePdfFromHtml(html: string, options: PdfOptions = {}): Promise<Buffer> {
    return this.executeWithPage(async (page) => {
      await page.setContent(html, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      const pdfBuffer = await page.pdf({
        format: options.format ?? "A4",
        ...(options.width ? { width: options.width, height: options.height } : {}),
        printBackground: options.printBackground ?? true,
        margin: options.margin ?? { top: "0", bottom: "0", left: "0", right: "0" },
        timeout: 30000,
      });

      return Buffer.from(pdfBuffer);
    });
  }

  async executeWithPage<T>(
    task: PageTask<T> | ((page: import("puppeteer").Page) => Promise<T>),
  ): Promise<T> {
    const taskFn = typeof task === "function" ? task : task.execute;
    const url = typeof task === "object" ? task.url : undefined;
    const waitUntil = typeof task === "object" ? task.waitUntil : undefined;
    const timeout = typeof task === "object" ? task.timeout : undefined;

    return this.enqueue(async () => {
      const browser = await this.acquireBrowser();
      let page: import("puppeteer").Page | null = null;

      try {
        page = await browser.newPage();
        page.setDefaultTimeout(timeout ?? 30000);

        await page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        );

        if (url) {
          await page.goto(url, {
            waitUntil: waitUntil ?? "networkidle2",
            timeout: timeout ?? 30000,
          });
        }

        return await taskFn(page);
      } finally {
        if (page) {
          try {
            await page.close();
          } catch {
            this.logger.warn("Page close failed");
          }
        }
        this.scheduleIdleClose();
      }
    });
  }

  async scrapeWebsite<T>(
    url: string,
    evaluateFn: () => T,
    options?: {
      waitUntil?: "load" | "domcontentloaded" | "networkidle0" | "networkidle2";
      timeout?: number;
    },
  ): Promise<T> {
    return this.executeWithPage({
      url,
      waitUntil: options?.waitUntil ?? "networkidle2",
      timeout: options?.timeout ?? 30000,
      execute: async (page) => {
        return page.evaluate(evaluateFn);
      },
    });
  }

  private async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.taskQueue.push({
        task: task as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.taskQueue.length > 0 && this.activeTaskCount < this.maxConcurrent) {
      const queuedTask = this.taskQueue.shift();
      if (!queuedTask) {
        continue;
      }

      this.activeTaskCount++;
      this.clearIdleTimeout();

      queuedTask
        .task()
        .then((result) => {
          this.activeTaskCount--;
          queuedTask.resolve(result);
          this.processQueue();
        })
        .catch((error) => {
          this.activeTaskCount--;
          queuedTask.reject(error instanceof Error ? error : new Error(String(error)));
          this.processQueue();
        });
    }

    this.isProcessingQueue = false;
  }

  private async acquireBrowser(): Promise<import("puppeteer").Browser> {
    this.clearIdleTimeout();

    if (this.browser) {
      try {
        await this.browser.version();
        return this.browser;
      } catch {
        this.logger.warn("Browser disconnected, relaunching");
        this.browser = null;
        this.browserPromise = null;
      }
    }

    if (this.browserPromise) {
      return this.browserPromise;
    }

    this.browserPromise = this.launchBrowser();

    try {
      this.browser = await this.browserPromise;
      return this.browser;
    } catch (error) {
      this.browserPromise = null;
      throw error;
    }
  }

  private async launchBrowser(): Promise<import("puppeteer").Browser> {
    let puppeteer: typeof import("puppeteer");
    try {
      puppeteer = await import("puppeteer");
    } catch (importError) {
      this.logger.error("Failed to import puppeteer", importError);
      throw new Error("Puppeteer is not available");
    }

    this.logger.log("Launching pooled browser instance");
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;

    const browser = await puppeteer.launch({
      headless: "shell",
      timeout: 60000,
      executablePath: executablePath ?? undefined,
      args: this.defaultArgs,
    });

    this.logger.log("Browser launched successfully");
    return browser;
  }

  private scheduleIdleClose(): void {
    if (this.activeTaskCount > 0 || this.taskQueue.length > 0) {
      return;
    }

    this.clearIdleTimeout();
    this.idleTimeout = setTimeout(() => {
      this.closeBrowser();
    }, this.idleTimeoutMs);
  }

  private clearIdleTimeout(): void {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }
  }

  private async closeBrowser(): Promise<void> {
    this.clearIdleTimeout();

    if (this.browser) {
      this.logger.log("Closing idle browser instance");
      try {
        await this.browser.close();
      } catch {
        this.logger.warn("Browser close failed");
      }
      this.browser = null;
      this.browserPromise = null;
    }
  }
}
