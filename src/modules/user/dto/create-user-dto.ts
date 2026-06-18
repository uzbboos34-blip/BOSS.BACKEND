import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional } from "class-validator";

export class CreateUserDto {
  @ApiProperty({ description: "Full name of the user" })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ description: "Phone number of the user" })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: "Password of the user" })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class UpdateUserDto {
  @ApiProperty({ required: false, description: "Full name of the user" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fullName?: string;

  @ApiProperty({ required: false, description: "Phone number of the user" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @ApiProperty({ required: false, description: "Password of the user" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  password?: string;

  @ApiProperty({ required: false, description: "Activation status of the user" })
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ required: false, description: "Blocked status of the user" })
  @IsOptional()
  isBlocked?: boolean;
}
