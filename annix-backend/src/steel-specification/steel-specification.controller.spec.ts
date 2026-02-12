import { Test, TestingModule } from '@nestjs/testing';
import { SteelSpecificationController } from './steel-specification.controller';
import { SteelSpecificationService } from './steel-specification.service';
import { CreateSteelSpecificationDto } from './dto/create-steel-specification.dto';
import { UpdateSteelSpecificationDto } from './dto/update-steel-specification.dto';
import { SteelSpecification } from './entities/steel-specification.entity';

describe('SteelSpecificationController', () => {
  let controller: SteelSpecificationController;
  let service: jest.Mocked<SteelSpecificationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SteelSpecificationController],
      providers: [
        {
          provide: SteelSpecificationService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SteelSpecificationController>(SteelSpecificationController);
    service = module.get(SteelSpecificationService) as jest.Mocked<SteelSpecificationService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with dto and return result', async () => {
      const dto: CreateSteelSpecificationDto = { steelSpecName: 'S355' };
      const result: SteelSpecification = { id: 1, steelSpecName: dto.steelSpecName };

      service.create.mockResolvedValue(result);

      expect(await controller.create(dto)).toEqual(result);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return an array of steel specifications', async () => {
      const result: SteelSpecification[] = [{ id: 1, steelSpecName: 'S355' }];
      service.findAll.mockResolvedValue(result);

      expect(await controller.findAll()).toEqual(result);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single steel specification by id', async () => {
      const result: SteelSpecification = { id: 1, steelSpecName: 'S355' };
      service.findOne.mockResolvedValue(result);

      expect(await controller.findOne(1)).toEqual(result);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should call service.update with id and dto', async () => {
      const dto: UpdateSteelSpecificationDto = { steelSpecName: 'S275' };
      const result: SteelSpecification = { id: 1, steelSpecName: dto.steelSpecName! };

      service.update.mockResolvedValue(result);

      expect(await controller.update(1, dto)).toEqual(result);
      expect(service.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('remove', () => {
    it('should call service.remove with id', async () => {
      service.remove.mockResolvedValue(undefined);

      expect(await controller.remove(1)).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});
