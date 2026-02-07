import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";
import { CreateUserRoleDto } from "./dto/create-user-role.dto";
import { UpdateUserRoleDto } from "./dto/update-user-role.dto";
import { UserRole } from "./entities/user-role.entity";
import { UserRolesService } from "./user-roles.service";

@Controller("user-roles")
export class UserRolesController {
  constructor(private readonly userRolesService: UserRolesService) {}

  @Post()
  @ApiOperation({ summary: "Create a new role" })
  @ApiResponse({
    status: 201,
    description: "Role created successfully",
    type: UserRole,
  })
  @ApiResponse({ status: 409, description: "Role already exists" })
  create(@Body() createUserRoleDto: CreateUserRoleDto) {
    return this.userRolesService.create(createUserRoleDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all roles" })
  @ApiResponse({ status: 200, description: "List of roles", type: [UserRole] })
  findAll() {
    return this.userRolesService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a role by ID" })
  @ApiResponse({ status: 200, description: "Role found", type: UserRole })
  @ApiResponse({ status: 404, description: "Role not found" })
  findOne(@Param("id") id: string) {
    return this.userRolesService.findOne(+id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a role by ID" })
  @ApiResponse({
    status: 200,
    description: "Role updated successfully",
    type: UserRole,
  })
  @ApiResponse({ status: 404, description: "Role not found" })
  update(@Param("id") id: string, @Body() updateUserRoleDto: UpdateUserRoleDto) {
    return this.userRolesService.update(+id, updateUserRoleDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a role by ID" })
  @ApiResponse({ status: 200, description: "Role deleted successfully" })
  @ApiResponse({ status: 404, description: "Role not found" })
  remove(@Param("id") id: string) {
    return this.userRolesService.remove(+id);
  }
}
