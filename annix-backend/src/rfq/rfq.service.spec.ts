import { Test, TestingModule } from '@nestjs/testing';
import { RfqService } from './rfq.service';
import { NotFoundException } from '@nestjs/common';
import { Rfq } from './entities/rfq.entity';
import { RfqItem } from './entities/rfq-item.entity';
import { StraightPipeRfq } from './entities/straight-pipe-rfq.entity';
import { BendRfq } from './entities/bend-rfq.entity';
import { FittingRfq } from './entities/fitting-rfq.entity';
import { RfqDocument } from './entities/rfq-document.entity';
import { RfqDraft } from './entities/rfq-draft.entity';
import { RfqSequence } from './entities/rfq-sequence.entity';
import { User } from '../user/entities/user.entity';
import { SteelSpecification } from '../steel-specification/entities/steel-specification.entity';
import { PipeDimension } from '../pipe-dimension/entities/pipe-dimension.entity';
import { NbNpsLookup } from '../nb-nps-lookup/entities/nb-nps-lookup.entity';
import { FlangeDimension } from '../flange-dimension/entities/flange-dimension.entity';
import { BoltMass } from '../bolt-mass/entities/bolt-mass.entity';
import { NutMass } from '../nut-mass/entities/nut-mass.entity';
import { Boq } from '../boq/entities/boq.entity';
import { BoqSupplierAccess } from '../boq/entities/boq-supplier-access.entity';
import { SupplierProfile } from '../supplier/entities/supplier-profile.entity';
import { STORAGE_SERVICE, IStorageService } from '../storage/storage.interface';
import { EmailService } from '../email/email.service';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('RfqService', () => {
  let service: RfqService;

  const mockRfqRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockRfqItemRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockStraightPipeRfqRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockBendRfqRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockFittingRfqRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockRfqDocumentRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockRfqDraftRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockRfqSequenceRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUserRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockSteelSpecRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockPipeDimensionRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockNbNpsLookupRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockFlangeDimensionRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockBoltMassRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockNutMassRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockStorageService: IStorageService = {
    upload: jest.fn(),
    download: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
    getPublicUrl: jest.fn(),
  };

  const mockBoqRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockBoqSupplierAccessRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockSupplierProfileRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockEmailService = {
    sendEmail: jest.fn(),
    sendBoqAccessEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RfqService,
        { provide: getRepositoryToken(Rfq), useValue: mockRfqRepo },
        { provide: getRepositoryToken(RfqItem), useValue: mockRfqItemRepo },
        {
          provide: getRepositoryToken(StraightPipeRfq),
          useValue: mockStraightPipeRfqRepo,
        },
        { provide: getRepositoryToken(BendRfq), useValue: mockBendRfqRepo },
        {
          provide: getRepositoryToken(FittingRfq),
          useValue: mockFittingRfqRepo,
        },
        {
          provide: getRepositoryToken(RfqDocument),
          useValue: mockRfqDocumentRepo,
        },
        { provide: getRepositoryToken(RfqDraft), useValue: mockRfqDraftRepo },
        {
          provide: getRepositoryToken(RfqSequence),
          useValue: mockRfqSequenceRepo,
        },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        {
          provide: getRepositoryToken(SteelSpecification),
          useValue: mockSteelSpecRepo,
        },
        {
          provide: getRepositoryToken(PipeDimension),
          useValue: mockPipeDimensionRepo,
        },
        {
          provide: getRepositoryToken(NbNpsLookup),
          useValue: mockNbNpsLookupRepo,
        },
        {
          provide: getRepositoryToken(FlangeDimension),
          useValue: mockFlangeDimensionRepo,
        },
        { provide: getRepositoryToken(BoltMass), useValue: mockBoltMassRepo },
        { provide: getRepositoryToken(NutMass), useValue: mockNutMassRepo },
        { provide: getRepositoryToken(Boq), useValue: mockBoqRepo },
        {
          provide: getRepositoryToken(BoqSupplierAccess),
          useValue: mockBoqSupplierAccessRepo,
        },
        {
          provide: getRepositoryToken(SupplierProfile),
          useValue: mockSupplierProfileRepo,
        },
        { provide: STORAGE_SERVICE, useValue: mockStorageService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<RfqService>(RfqService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllRfqs', () => {
    it('should return array of RFQs', async () => {
      const rfqs = [{ id: 1, rfqNumber: 'RFQ-2024-0001' }] as Rfq[];
      mockRfqRepo.find.mockResolvedValue(rfqs);

      const result = await service.findAllRfqs();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 1,
        rfqNumber: 'RFQ-2024-0001',
      });
    });
  });

  describe('findRfqById', () => {
    it('should return an RFQ by id', async () => {
      const rfq = { id: 1, rfqNumber: 'RFQ-2024-0001' } as Rfq;
      mockRfqRepo.findOne.mockResolvedValue(rfq);

      const result = await service.findRfqById(1);

      expect(result).toEqual(rfq);
      expect(mockRfqRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: [
          'items',
          'items.straightPipeDetails',
          'items.straightPipeDetails.steelSpecification',
          'drawings',
          'boqs',
        ],
      });
    });

    it('should throw NotFoundException if RFQ not found', async () => {
      mockRfqRepo.findOne.mockResolvedValue(null);

      await expect(service.findRfqById(1)).rejects.toThrow(NotFoundException);
    });
  });
});
