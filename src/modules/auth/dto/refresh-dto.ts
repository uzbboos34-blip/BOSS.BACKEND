import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class RefreshDto {
  @ApiProperty({ example: "eyJhbGciOiJIUzI1Ni..." })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
