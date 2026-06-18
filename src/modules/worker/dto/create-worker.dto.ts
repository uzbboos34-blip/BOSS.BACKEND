import { ApiProperty } from "@nestjs/swagger";
import { CitizenShip, Gender } from "@prisma/client";
import { Transform } from "class-transformer";
import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsEnum, 
  IsDateString, 
  IsNumber, 
  IsInt, 
  Min 
} from "class-validator";

/** Bo'sh string ("") kelsa → undefined ga o'giradi, @IsOptional() o'tkazib yuboradi */
const trimOptional = () =>
  Transform(({ value }) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  );

export class CreateWorkerDto {
  @ApiProperty({ required: false, description: "Center number" })
  @IsOptional()
  @trimOptional()
  @IsString()
  @IsNotEmpty()
  centerNo?: string;

  @ApiProperty({ description: "Passport details" })
  @IsString()
  @IsNotEmpty()
  passport: string;

  @ApiProperty({ required: false, description: "Construction site" })
  @IsOptional()
  @trimOptional()
  @IsString()
  @IsNotEmpty()
  constructionSite?: string;

  @ApiProperty({ required: false, description: "Sicil number" })
  @IsOptional()
  @trimOptional()
  @IsString()
  @IsNotEmpty()
  sicilNo?: string;

  @ApiProperty({ description: "Worker's full name" })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ required: false, description: "Worker's full name in Russian" })
  @IsOptional()
  @trimOptional()
  @IsString()
  @IsNotEmpty()
  fullNameRu?: string;

  @ApiProperty({ required: false, description: "Worker's position" })
  @IsOptional()
  @trimOptional()
  @IsString()
  @IsNotEmpty()
  position?: string;

  @ApiProperty({ required: false, enum: CitizenShip, default: CitizenShip.UZ, description: "Citizenship status" })
  @IsOptional()
  @IsEnum(CitizenShip)
  citizenship?: CitizenShip;

  @ApiProperty({ required: false, description: "Work start date (ISO format)" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false, description: "Hourly wage rate" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiProperty({ required: false, description: "Team division name" })
  @IsOptional()
  @trimOptional()
  @IsString()
  @IsNotEmpty()
  teamDivision?: string;

  @ApiProperty({ required: false, description: "Department name" })
  @IsOptional()
  @trimOptional()
  @IsString()
  @IsNotEmpty()
  department?: string;

  @ApiProperty({ required: false, description: "Phone number" })
  @IsOptional()
  @trimOptional()
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @ApiProperty({ required: false, description: "Birth date (ISO format)" })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiProperty({ required: false, description: "Patent number" })
  @IsOptional()
  @trimOptional()
  @IsString()
  @IsNotEmpty()
  patentNo?: string;
  
  @ApiProperty({ required: false, description: "Patent start date (ISO format)" })
  @IsOptional()
  @IsDateString()
  patentStartDate?: string;

  @ApiProperty({ required: false, description: "INN (Taxpayer Identification Number)" })
  @IsOptional()
  @trimOptional()
  @IsString()
  @IsNotEmpty()
  inn?: string;

  @ApiProperty({ description: "QR Code string" })
  @IsString()
  @IsNotEmpty()
  qrCode: string;

  @ApiProperty({ required: false, description: "Camp address" })
  @IsOptional()
  @trimOptional()
  @IsString()
  @IsNotEmpty()
  campAddress?: string;

  @ApiProperty({ required: false, enum: Gender, description: "Gender" })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;



  @ApiProperty({ required: false, description: "Specialization ID" })
  @IsOptional()
  @IsInt()
  specializationId?: number;

  @ApiProperty({ required: false, description: "Group ID" })
  @IsOptional()
  @IsInt()
  groupId?: number;
}

export class UpdateWorkerDto {
  @ApiProperty({ required: false, description: "Center number" })
  @IsOptional()
  @trimOptional()
  @IsString()
  @IsNotEmpty()
  centerNo?: string;

  @ApiProperty({ required: false, description: "Passport details" })
  @IsOptional()
  @trimOptional()
  @IsString()
  @IsNotEmpty()
  passport?: string;

  @ApiProperty({ required: false, description: "Construction site" })
  @IsOptional()
  @trimOptional()
  @IsString()
  @IsNotEmpty()
  constructionSite?: string;

  @ApiProperty({ required: false, description: "Sicil number" })
  @IsOptional()
  @trimOptional()
  @IsString()
  @IsNotEmpty()
  sicilNo?: string;

  @ApiProperty({ required: false, description: "Worker's full name" })
  @IsOptional()
  @trimOptional()
  @IsString()
  @IsNotEmpty()
  fullName?: string;

  @ApiProperty({ required: false, description: "Worker's full name in Russian" })
  @IsOptional()
  @trimOptional()
  @IsString()
  @IsNotEmpty()
  fullNameRu?: string;

  @ApiProperty({ required: false, description: "Worker's position" })
  @IsOptional()
  @trimOptional()
  @IsString()
  @IsNotEmpty()
  position?: string;

  @ApiProperty({ required: false, enum: CitizenShip, description: "Citizenship status" })
  @IsOptional()
  @IsEnum(CitizenShip)
  citizenship?: CitizenShip;

  @ApiProperty({ required: false, description: "Work start date (ISO format)" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false, description: "Hourly wage rate" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiProperty({ required: false, description: "Team division name" })
  @IsOptional()
  @trimOptional()
  @IsString()
  @IsNotEmpty()
  teamDivision?: string;

  @ApiProperty({ required: false, description: "Department name" })
  @IsOptional()
  @trimOptional()
  @IsString()
  @IsNotEmpty()
  department?: string;

  @ApiProperty({ required: false, description: "Phone number" })
  @IsOptional()
  @trimOptional()
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @ApiProperty({ required: false, description: "Birth date (ISO format)" })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiProperty({ required: false, description: "Patent number" })
  @IsOptional()
  @trimOptional()
  @IsString()
  @IsNotEmpty()
  patentNo?: string;

  @ApiProperty({ required: false, description: "Patent start date (ISO format)" })
  @IsOptional()
  @IsDateString()
  patentStartDate?: string;

  @ApiProperty({ required: false, description: "INN (Taxpayer Identification Number)" })
  @IsOptional()
  @trimOptional()
  @IsString()
  @IsNotEmpty()
  inn?: string;

  @ApiProperty({ required: false, description: "QR Code string" })
  @IsOptional()
  @trimOptional()
  @IsString()
  @IsNotEmpty()
  qrCode?: string;

  @ApiProperty({ required: false, description: "Camp address" })
  @IsOptional()
  @trimOptional()
  @IsString()
  @IsNotEmpty()
  campAddress?: string;

  @ApiProperty({ required: false, enum: Gender, description: "Gender" })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;



  @ApiProperty({ required: false, description: "Specialization ID" })
  @IsOptional()
  @IsInt()
  specializationId?: number;

  @ApiProperty({ required: false, description: "Group ID" })
  @IsOptional()
  @IsInt()
  groupId?: number;
}
