import { Test, TestingModule } from '@nestjs/testing';
import { NominalOutsideDiameterMmController } from './nominal-outside-diameter-mm.controller';
import { NominalOutsideDiameterMmService } from './nominal-outside-diameter-mm.service';
import { CreateNominalOutsideDiameterMmDto } from './dto/create-nominal-outside-diameter-mm.dto';
import { UpdateNominalOutsideDiameterMmDto } from './dto/update-nominal-outside-diameter-mm.dto';
import { NominalOutsideDiameterMm } from './entities/nominal-outside-diameter-mm.entity';

describe('NominalOutsideDiameterMmController', () => {
  let controller: NominalOutsideDiameterMmController;
  let service: jest.Mocked<NominalOutsideDiameterMmService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NominalOutsideDiameterMmController],
      providers: [
        {
          provide: NominalOutsideDiameterMmService,
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

    controller = module.get<NominalOutsideDiameterMmController>(
      NominalOutsideDiameterMmController,
    );
    service = module.get(NominalOutsideDiameterMmService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with dto and return result', async () => {
      const dto: CreateNominalOutsideDiameterMmDto = {
        nominal_diameter_mm: 50,
        outside_diameter_mm: 60.32,
      };

      const result: NominalOutsideDiameterMm = {
        id: 1,
        ...dto,
      };

      service.create.mockResolvedValue(result);

      expect(await controller.create(dto)).toEqual(result);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return array of values', async () => {
      const result: NominalOutsideDiameterMm[] = [
        { id: 1, nominal_diameter_mm: 50, outside_diameter_mm: 60.32 },
      ];

      service.findAll.mockResolvedValue(result);

      expect(await controller.findAll()).toEqual(result);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return one value by id', async () => {
      const result: NominalOutsideDiameterMm = {
        id: 1,
        nominal_diameter_mm: 50,
        outside_diameter_mm: 60.32,
      };

      service.findOne.mockResolvedValue(result);

      expect(await controller.findOne(1)).toEqual(result);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should call service.update with id and dto', async () => {
      const dto: UpdateNominalOutsideDiameterMmDto = {
        nominal_diameter_mm: 65,
        outside_diameter_mm: 76.2,
      };

      const result: NominalOutsideDiameterMm = {
        id: 1,
        nominal_diameter_mm: dto.nominal_diameter_mm!,
        outside_diameter_mm: dto.outside_diameter_mm!,
      };

      service.update.mockResolvedValue(result);

      expect(await controller.update('1', dto)).toEqual(result);
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
