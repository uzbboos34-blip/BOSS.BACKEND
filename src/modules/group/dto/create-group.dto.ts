import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsInt, IsOptional } from "class-validator";

export class CreateGroupDto {
  @ApiProperty({ description: 'Group name' })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class UpdateGroupDto {
  @ApiProperty({ required: false, description: 'Group name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;
}
