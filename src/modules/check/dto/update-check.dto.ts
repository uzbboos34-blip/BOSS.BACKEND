import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsInt, Min, IsNotEmpty } from "class-validator";

export class UpdateCheckDto {
  @ApiProperty({ description: "Date when the payment was made (ISO format)" })
  @IsDateString()
  @IsNotEmpty()
  paidAt: string;

  @ApiProperty({ description: "Number of months paid (1, 2, etc.)" })
  @IsInt()
  @Min(1)
  numberOfMonths: number;
}
