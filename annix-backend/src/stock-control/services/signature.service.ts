import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { StaffSignature } from "../entities/staff-signature.entity";

@Injectable()
export class SignatureService {
  private readonly logger = new Logger(SignatureService.name);

  constructor(
    @InjectRepository(StaffSignature)
    private readonly signatureRepo: Repository<StaffSignature>,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  async findByUser(userId: number): Promise<StaffSignature | null> {
    return this.signatureRepo.findOne({
      where: { userId },
    });
  }

  async uploadSignature(
    companyId: number,
    userId: number,
    dataUrl: string,
  ): Promise<StaffSignature> {
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const mimeMatch = dataUrl.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
    const extension = mimeType.split("/")[1] || "png";

    const file: Express.Multer.File = {
      fieldname: "signature",
      originalname: `signature-${userId}.${extension}`,
      encoding: "base64",
      mimetype: mimeType,
      buffer,
      size: buffer.length,
      destination: "",
      filename: "",
      path: "",
      stream: null as never,
    };

    const result = await this.storageService.upload(
      file,
      `stock-control/signatures/${companyId}`,
    );

    const existing = await this.findByUser(userId);

    if (existing) {
      existing.signatureUrl = result.url;
      return this.signatureRepo.save(existing);
    }

    const signature = this.signatureRepo.create({
      companyId,
      userId,
      signatureUrl: result.url,
    });

    return this.signatureRepo.save(signature);
  }

  async signatureUrl(userId: number): Promise<string | null> {
    const signature = await this.findByUser(userId);
    return signature?.signatureUrl ?? null;
  }

  async deleteSignature(userId: number): Promise<void> {
    const signature = await this.findByUser(userId);

    if (!signature) {
      throw new NotFoundException("Signature not found");
    }

    await this.signatureRepo.remove(signature);
    this.logger.log(`Deleted signature for user ${userId}`);
  }
}
