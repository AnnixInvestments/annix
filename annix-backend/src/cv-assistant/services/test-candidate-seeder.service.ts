import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import {
  Candidate,
  CandidateStatus,
  type ExtractedCvData,
  type MatchAnalysis,
} from "../entities/candidate.entity";
import { JobPosting } from "../entities/job-posting.entity";

interface FixtureProfile {
  label: "strong" | "borderline" | "weak" | "disqualified";
  weight: number;
  build: (job: JobPosting, index: number) => ExtractedCvData;
}

const FIRST_NAMES = [
  "Thandi",
  "Sipho",
  "Anele",
  "Lerato",
  "Bongani",
  "Nomvula",
  "Karabo",
  "Pieter",
  "Ayesha",
  "Johan",
  "Fatima",
  "Naledi",
  "Kgomotso",
  "Mandla",
  "Riaan",
  "Zanele",
  "Tshepo",
  "Refilwe",
  "Sarah",
  "James",
];
const LAST_NAMES = [
  "Mabaso",
  "Naidoo",
  "Botha",
  "Khumalo",
  "Pillay",
  "van der Merwe",
  "Mokoena",
  "Dlamini",
  "Nkosi",
  "Reddy",
  "Smith",
  "Patel",
  "Maree",
  "Mthembu",
  "Govender",
  "Esterhuysen",
  "Sithole",
  "Joubert",
];

const SA_CITIES = [
  "Johannesburg",
  "Cape Town",
  "Durban",
  "Pretoria",
  "Boksburg",
  "Centurion",
  "Sandton",
  "Roodepoort",
  "Port Elizabeth",
  "Bloemfontein",
];

const STRONG_CERTS = [
  "ECSA Pr Eng",
  "SAICA registered CA(SA)",
  "Code 10 (C1) driver's licence",
  "First Aid Level 2",
  "SACPCMP CHSO",
];

const BORDERLINE_CERTS = ["Code 8 (B) driver's licence", "First Aid Level 1"];

const PADDING_SKILLS = [
  "MS Excel",
  "Microsoft Office",
  "Communication",
  "Time management",
  "Problem solving",
  "Customer service",
  "Teamwork",
];

const STRONG_SUMMARIES = [
  "Seasoned professional with a track record of exceeding targets in the South African industrial sector.",
  "Highly experienced practitioner with deep domain knowledge and proven leadership.",
  "Senior contributor with a portfolio of measurable, repeatable outcomes for SA employers.",
];
const BORDERLINE_SUMMARIES = [
  "Mid-level practitioner looking to step into more senior responsibilities.",
  "Solid generalist with relevant exposure to the role's core domain.",
];
const WEAK_SUMMARIES = [
  "Recent graduate with limited industry exposure but strong willingness to learn.",
  "Career-changer pivoting from an unrelated field; transferable soft skills emphasised.",
];

const pick = <T>(arr: readonly T[], rand: () => number): T => arr[Math.floor(rand() * arr.length)];

const seededRandom = (seed: number): (() => number) => {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
};

@Injectable()
export class TestCandidateSeederService {
  private readonly logger = new Logger(TestCandidateSeederService.name);

  constructor(
    @InjectRepository(JobPosting)
    private readonly jobPostingRepo: Repository<JobPosting>,
    @InjectRepository(Candidate)
    private readonly candidateRepo: Repository<Candidate>,
  ) {}

  async seedForJobPosting(
    companyId: number,
    jobPostingId: number,
    count: number,
  ): Promise<{ created: number; byProfile: Record<string, number> }> {
    const job = await this.loadTestJob(companyId, jobPostingId);
    const safeCount = Math.max(1, Math.min(50, Math.floor(count)));
    const rand = seededRandom(jobPostingId * 1000 + Date.now());

    const profiles = this.profileMix(safeCount, rand);
    const byProfile: Record<string, number> = {
      strong: 0,
      borderline: 0,
      weak: 0,
      disqualified: 0,
    };

    const candidates: Candidate[] = [];
    for (let i = 0; i < profiles.length; i += 1) {
      const profile = profiles[i];
      const extractedData = profile.build(job, i);
      const matchAnalysis = this.computeFallbackMatch(extractedData, job);
      const name = extractedData.candidateName ?? `Test Candidate ${i + 1}`;
      const email = extractedData.email ?? `candidate-${jobPostingId}-${i}@example.com`;

      const candidate = this.candidateRepo.create({
        email,
        name,
        cvFilePath: null,
        rawCvText: this.synthesiseRawCvText(extractedData),
        extractedData,
        matchAnalysis,
        matchScore: matchAnalysis.overallScore,
        status: CandidateStatus.NEW,
        beeLevel: this.pickBeeLevel(rand),
        popiaConsent: true,
        popiaConsentedAt: now().toJSDate(),
        lastActiveAt: now().toJSDate(),
        jobAlertsOptIn: rand() > 0.5,
        jobPostingId: job.id,
        isTestFixture: true,
      });
      candidates.push(candidate);
      byProfile[profile.label] += 1;
    }

    await this.candidateRepo.save(candidates);

    this.logger.log(
      `Seeded ${candidates.length} test candidates for job ${jobPostingId} (${JSON.stringify(byProfile)})`,
    );

    return { created: candidates.length, byProfile };
  }

  async clearForJobPosting(companyId: number, jobPostingId: number): Promise<{ deleted: number }> {
    const job = await this.loadTestJob(companyId, jobPostingId);
    const result = await this.candidateRepo.delete({
      jobPostingId: job.id,
      isTestFixture: true,
    });
    return { deleted: result.affected ?? 0 };
  }

  private async loadTestJob(companyId: number, jobPostingId: number): Promise<JobPosting> {
    const job = await this.jobPostingRepo.findOne({
      where: { id: jobPostingId, companyId },
    });
    if (!job) {
      throw new NotFoundException("Job posting not found");
    }
    if (!job.testMode) {
      throw new ForbiddenException(
        "Test candidates can only be seeded against a job posting that was published in test mode.",
      );
    }
    return job;
  }

  private profileMix(count: number, rand: () => number): FixtureProfile[] {
    const definitions: FixtureProfile[] = [
      { label: "strong", weight: 0.3, build: (job, idx) => this.buildStrong(job, idx, rand) },
      {
        label: "borderline",
        weight: 0.3,
        build: (job, idx) => this.buildBorderline(job, idx, rand),
      },
      { label: "weak", weight: 0.3, build: (job, idx) => this.buildWeak(job, idx, rand) },
      {
        label: "disqualified",
        weight: 0.1,
        build: (job, idx) => this.buildDisqualified(job, idx, rand),
      },
    ];

    const out: FixtureProfile[] = [];
    for (const def of definitions) {
      const target = Math.round(count * def.weight);
      for (let i = 0; i < target; i += 1) out.push(def);
    }
    while (out.length < count) out.push(definitions[0]);
    while (out.length > count) out.pop();
    return out;
  }

  private buildStrong(job: JobPosting, idx: number, rand: () => number): ExtractedCvData {
    const name = `${pick(FIRST_NAMES, rand)} ${pick(LAST_NAMES, rand)}`;
    const requiredSkills = job.requiredSkills?.length
      ? job.requiredSkills
      : ["Industry knowledge", "Communication"];
    const experienceYears = (job.minExperienceYears ?? 3) + 2 + Math.floor(rand() * 4);
    return {
      candidateName: name,
      email: this.emailFor(name, idx, "strong"),
      phone: this.fakePhone(rand),
      experienceYears,
      skills: [...requiredSkills, ...this.shuffle(PADDING_SKILLS, rand).slice(0, 3)],
      education: [job.requiredEducation ?? "BCom (NQF7)", "Matric (NSC)"],
      certifications: [pick(STRONG_CERTS, rand), ...job.requiredCertifications],
      references: this.fakeReferences(rand, 2),
      summary: pick(STRONG_SUMMARIES, rand),
      detectedLanguage: "en",
      professionalRegistrations: [pick(STRONG_CERTS, rand)],
      saQualifications: ["NQF Level 7", "SAQA registered"],
      location: pick(SA_CITIES, rand),
    };
  }

  private buildBorderline(job: JobPosting, idx: number, rand: () => number): ExtractedCvData {
    const name = `${pick(FIRST_NAMES, rand)} ${pick(LAST_NAMES, rand)}`;
    const requiredSkills = job.requiredSkills ?? [];
    const partialSkills =
      requiredSkills.length > 0
        ? this.shuffle(requiredSkills, rand).slice(
            0,
            Math.max(1, Math.floor(requiredSkills.length / 2)),
          )
        : ["General industry exposure"];
    const experienceYears = Math.max(0, (job.minExperienceYears ?? 3) - 1 + Math.floor(rand() * 2));
    return {
      candidateName: name,
      email: this.emailFor(name, idx, "borderline"),
      phone: this.fakePhone(rand),
      experienceYears,
      skills: [...partialSkills, ...this.shuffle(PADDING_SKILLS, rand).slice(0, 4)],
      education: ["Matric (NSC)", "Diploma (NQF6)"],
      certifications: [pick(BORDERLINE_CERTS, rand)],
      references: this.fakeReferences(rand, 1),
      summary: pick(BORDERLINE_SUMMARIES, rand),
      detectedLanguage: "en",
      professionalRegistrations: [],
      saQualifications: ["NQF Level 6"],
      location: pick(SA_CITIES, rand),
    };
  }

  private buildWeak(job: JobPosting, idx: number, rand: () => number): ExtractedCvData {
    const name = `${pick(FIRST_NAMES, rand)} ${pick(LAST_NAMES, rand)}`;
    const requiredSkills = job.requiredSkills ?? [];
    const oneSkill = requiredSkills.length > 0 ? [pick(requiredSkills, rand)] : [];
    return {
      candidateName: name,
      email: this.emailFor(name, idx, "weak"),
      phone: this.fakePhone(rand),
      experienceYears: Math.floor(rand() * 2),
      skills: [...oneSkill, ...this.shuffle(PADDING_SKILLS, rand).slice(0, 3)],
      education: ["Matric (NSC)"],
      certifications: [],
      references: this.fakeReferences(rand, 1),
      summary: pick(WEAK_SUMMARIES, rand),
      detectedLanguage: "en",
      professionalRegistrations: [],
      saQualifications: ["NQF Level 4"],
      location: pick(SA_CITIES, rand),
    };
  }

  private buildDisqualified(job: JobPosting, idx: number, rand: () => number): ExtractedCvData {
    const name = `${pick(FIRST_NAMES, rand)} ${pick(LAST_NAMES, rand)}`;
    return {
      candidateName: name,
      email: this.emailFor(name, idx, "disqualified"),
      phone: this.fakePhone(rand),
      experienceYears: 0,
      skills: this.shuffle(PADDING_SKILLS, rand).slice(0, 2),
      education: [],
      certifications: [],
      references: [],
      summary:
        "Cover note mentions enthusiasm and willingness to learn but does not match the role requirements.",
      detectedLanguage: "en",
      professionalRegistrations: [],
      saQualifications: [],
      location: pick(SA_CITIES, rand),
    };
  }

  private emailFor(name: string, idx: number, label: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z]+/g, ".")
      .replace(/^\.|\.$/g, "");
    return `${slug}.${label}.${idx}@example.com`;
  }

  private fakePhone(rand: () => number): string {
    const last4 = Math.floor(1000 + rand() * 9000);
    return `+27 11 000 ${last4}`;
  }

  private fakeReferences(
    rand: () => number,
    count: number,
  ): Array<{ name: string; email: string; relationship: string | null }> {
    const out: Array<{ name: string; email: string; relationship: string | null }> = [];
    for (let i = 0; i < count; i += 1) {
      const name = `${pick(FIRST_NAMES, rand)} ${pick(LAST_NAMES, rand)}`;
      out.push({
        name,
        email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}.${i}@example.com`,
        relationship: pick(["Direct manager", "Team lead", "Colleague", "Mentor"], rand),
      });
    }
    return out;
  }

  private pickBeeLevel(rand: () => number): number | null {
    const roll = rand();
    if (roll < 0.4) return null;
    return Math.floor(rand() * 8) + 1;
  }

  private shuffle<T>(arr: readonly T[], rand: () => number): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  private synthesiseRawCvText(data: ExtractedCvData): string {
    const lines = [
      data.candidateName,
      data.email,
      data.phone,
      "",
      "Summary:",
      data.summary ?? "",
      "",
      "Skills:",
      ...data.skills.map((s) => `- ${s}`),
      "",
      "Education:",
      ...data.education.map((e) => `- ${e}`),
      "",
      "Certifications:",
      ...data.certifications.map((c) => `- ${c}`),
      "",
      "Experience:",
      `${data.experienceYears ?? 0} years total experience`,
    ];
    return lines.filter(Boolean).join("\n");
  }

  private computeFallbackMatch(data: ExtractedCvData, job: JobPosting): MatchAnalysis {
    const candidateSkillsLower = data.skills.map((s) => s.toLowerCase());
    const requiredSkillsLower = (job.requiredSkills ?? []).map((s) => s.toLowerCase());

    const skillsMatched = requiredSkillsLower.filter((skill) =>
      candidateSkillsLower.some((cSkill) => cSkill.includes(skill) || skill.includes(cSkill)),
    );
    const skillsMissing = requiredSkillsLower.filter((skill) => !skillsMatched.includes(skill));

    const skillScore =
      requiredSkillsLower.length > 0
        ? (skillsMatched.length / requiredSkillsLower.length) * 40
        : 20;

    const minExp = job.minExperienceYears;
    const candidateExp = data.experienceYears;
    const experienceMatch =
      !minExp || (candidateExp !== null && candidateExp !== undefined && candidateExp >= minExp);
    const experienceScore = experienceMatch ? 25 : 0;

    const educationMatch = !job.requiredEducation || data.education.length > 0;
    const educationScore = educationMatch ? 20 : 0;

    const certMatch =
      (job.requiredCertifications ?? []).length === 0 || data.certifications.length > 0;
    const certScore = certMatch ? 15 : 0;

    const overallScore = Math.round(skillScore + experienceScore + educationScore + certScore);

    const recommendation: "reject" | "review" | "shortlist" =
      overallScore >= 80 ? "shortlist" : overallScore >= 50 ? "review" : "reject";

    return {
      overallScore,
      skillsMatched: (job.requiredSkills ?? []).filter((_, i) =>
        skillsMatched.includes(requiredSkillsLower[i]),
      ),
      skillsMissing: (job.requiredSkills ?? []).filter((_, i) =>
        skillsMissing.includes(requiredSkillsLower[i]),
      ),
      experienceMatch,
      educationMatch,
      recommendation,
      reasoning: "Synthetic test fixture — keyword-based fallback match analysis.",
    };
  }
}
