import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsDateString, IsInt, Min, IsOptional, IsNumber } from "class-validator";

export class CreateCheckDto {
  @ApiProperty({ description: "Passport number of the worker" })
  @IsString()
  @IsNotEmpty()
  passport: string;

  @ApiProperty({ description: "Date when the payment was made (ISO format)" })
  @IsDateString()
  @IsNotEmpty()
  paidAt: string;

  @ApiProperty({ description: "Number of months paid (1, 2, etc.)" })
  @IsInt()
  @Min(1)
  numberOfMonths: number;
}
