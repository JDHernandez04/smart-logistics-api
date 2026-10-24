import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

export class EdgeDto {
  @ApiProperty({ example: 'A', description: 'Origin node identifier' })
  @IsString()
  @IsNotEmpty()
  from: string;

  @ApiProperty({ example: 'B', description: 'Destination node identifier' })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiProperty({ example: 10, description: 'Base traversal cost' })
  @IsNumber()
  @IsPositive()
  cost: number;

  @ApiPropertyOptional({ example: 5000, description: 'Maximum allowed vehicle weight' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  maxWeight?: number;

  @ApiPropertyOptional({ example: true, description: 'If true, hazardous materials are forbidden' })
  @IsOptional()
  @IsBoolean()
  noHazardous?: boolean;

  @ApiPropertyOptional({ example: 1.5, description: 'Cost multiplier during peak hours' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  trafficMultiplier?: number;
}

export class UploadNetworkDto {
  @ApiProperty({ type: [EdgeDto], description: 'List of graph edges' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EdgeDto) // Required for validating arrays of nested objects
  edges: EdgeDto[];
}