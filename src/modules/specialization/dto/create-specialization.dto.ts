import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsInt, IsOptional } from "class-validator";

export class CreateSpecializationDto {
  @ApiProperty({ description: 'Specialization name' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateSpecializationDto {
  @ApiProperty({ required: false, description: 'Specialization name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
}
