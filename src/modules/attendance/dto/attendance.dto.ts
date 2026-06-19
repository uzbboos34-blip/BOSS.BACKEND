import { ApiProperty } from "@nestjs/swagger";
import { AttendanceStatus } from "@prisma/client";
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
  Min,
  Max,
} from "class-validator";

export class ScanAttendanceDto {
  @ApiProperty({ description: "Worker's QR code string" })
  @IsString()
  @IsNotEmpty()
  qrCode: string;

  @ApiProperty({ enum: AttendanceStatus, description: "Attendance status" })
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @ApiProperty({ description: "Session number: 1=morning, 2=midday, 3=evening", minimum: 1, maximum: 3 })
  @IsInt()
  @Min(1)
  @Max(3)
  session: number;

  @ApiProperty({ required: false, description: "Date of attendance (ISO format). Defaults to today if not provided." })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ required: false, description: "Optional note or custom reason for status" })
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateAttendanceDto {
  @ApiProperty({ required: false, enum: AttendanceStatus, description: "Attendance status" })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @ApiProperty({ required: false, description: "Session number: 1, 2, or 3", minimum: 1, maximum: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  session?: number;

  @ApiProperty({ required: false, description: "Optional note or custom reason for status" })
  @IsOptional()
  @IsString()
  note?: string;
}

export class AssignWorkerDto {
  @ApiProperty({ description: "Supervisor's user ID" })
  @IsInt()
  supervisorId: number;

  @ApiProperty({ type: [Number], description: "List of worker IDs to assign" })
  @IsInt({ each: true })
  workerIds: number[];
}
