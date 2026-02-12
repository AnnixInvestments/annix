import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBoltDto {
  @ApiProperty({
    description: 'Bolt designation',
    example: "M12",
  })  
  @IsString()
  @IsNotEmpty()
  designation: string; // "M12", "M16", etc.
}
