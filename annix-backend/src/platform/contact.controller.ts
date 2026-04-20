import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { ContactService } from "./contact.service";
import { ContactFilterDto, CreateContactDto, UpdateContactDto } from "./dto/contact.dto";

@ApiTags("Contacts (Unified)")
@Controller("platform/companies/:companyId/contacts")
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Get()
  @ApiOperation({ summary: "Search contacts with pagination and filters" })
  @ApiParam({ name: "companyId", type: Number })
  search(@Param("companyId", ParseIntPipe) companyId: number, @Query() filters: ContactFilterDto) {
    return this.contactService.search(companyId, filters);
  }

  @Get("suppliers")
  @ApiOperation({ summary: "List all suppliers for a company" })
  @ApiParam({ name: "companyId", type: Number })
  suppliers(@Param("companyId", ParseIntPipe) companyId: number) {
    return this.contactService.suppliers(companyId);
  }

  @Get("customers")
  @ApiOperation({ summary: "List all customers for a company" })
  @ApiParam({ name: "companyId", type: Number })
  customers(@Param("companyId", ParseIntPipe) companyId: number) {
    return this.contactService.customers(companyId);
  }

  @Get("unmapped")
  @ApiOperation({ summary: "List contacts without Sage mapping" })
  @ApiParam({ name: "companyId", type: Number })
  unmapped(@Param("companyId", ParseIntPipe) companyId: number) {
    return this.contactService.unmappedContacts(companyId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get contact by ID" })
  @ApiParam({ name: "companyId", type: Number })
  @ApiParam({ name: "id", type: Number })
  findOne(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.contactService.findByCompanyAndId(companyId, id);
  }

  @Post()
  @ApiOperation({ summary: "Create a new contact" })
  @ApiParam({ name: "companyId", type: Number })
  create(@Param("companyId", ParseIntPipe) companyId: number, @Body() dto: CreateContactDto) {
    return this.contactService.create({ ...dto, companyId });
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a contact" })
  @ApiParam({ name: "companyId", type: Number })
  @ApiParam({ name: "id", type: Number })
  update(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactService.update(companyId, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a contact" })
  @ApiParam({ name: "companyId", type: Number })
  @ApiParam({ name: "id", type: Number })
  remove(
    @Param("companyId", ParseIntPipe) companyId: number,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.contactService.remove(companyId, id);
  }

  @Patch(":id/sage-mapping")
  @ApiOperation({ summary: "Update Sage contact mapping" })
  @ApiParam({ name: "companyId", type: Number })
  @ApiParam({ name: "id", type: Number })
  updateSageMapping(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { sageContactId: number | null; sageContactType: string | null },
  ) {
    return this.contactService.updateSageMapping(id, body.sageContactId, body.sageContactType);
  }
}
