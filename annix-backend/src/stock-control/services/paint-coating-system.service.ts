import { Injectable } from "@nestjs/common";
import { CoatingSpecificationService } from "../../coating-specification/coating-specification.service";
import {
  type CoatingSystemOption,
  deriveCoatingSystemCoats,
  totalDftFromRange,
} from "../config/coating-system-derivation";

@Injectable()
export class PaintCoatingSystemService {
  constructor(private readonly coatingSpecificationService: CoatingSpecificationService) {}

  async coatingSystems(): Promise<CoatingSystemOption[]> {
    const categories = await this.coatingSpecificationService.getCorrosivityCategories();
    const options = await Promise.all(
      categories.map((category) => this.buildOption(category.category, category.description)),
    );
    return options.filter((option): option is CoatingSystemOption => option !== null);
  }

  private async buildOption(
    category: string,
    description: string,
  ): Promise<CoatingSystemOption | null> {
    const sourceCategory = category === "C1" ? "C2" : category;
    const systems = await this.coatingSpecificationService.systemsByCategory(sourceCategory);
    if (!systems || systems.length === 0) {
      return null;
    }
    const recommended = systems.find((system) => system.isRecommended) || systems[0];
    const coats = deriveCoatingSystemCoats(recommended);
    if (coats.length === 0) {
      return null;
    }
    return {
      category,
      description,
      systemCode: recommended.systemCode || null,
      systemLabel: recommended.system,
      totalDftUm: totalDftFromRange(recommended.totalDftUmRange),
      coats,
    };
  }
}
