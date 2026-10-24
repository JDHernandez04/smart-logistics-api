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
  Matches,
  ValidateNested,
} from 'class-validator';

export class VehicleProfileDto {
  @ApiProperty({ example: 'truck', description: 'Vehicle classification type' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ example: 4000, description: 'Vehicle gross weight in kg' })
  @IsNumber()
  @IsPositive()
  weight: number;

  @ApiProperty({ example: false, description: 'Whether the vehicle carries hazardous cargo' })
  @IsBoolean()
  hazardous: boolean;
}

export class OptimizeRouteDto {
  @ApiProperty({ example: 'A', description: 'Starting node identifier' })
  @IsString()
  @IsNotEmpty()
  originNodeId: string;

  @ApiProperty({ example: 'E', description: 'Target destination node identifier' })
  @IsString()
  @IsNotEmpty()
  destinationNodeId: string;

  @ApiPropertyOptional({
    example: ['C'],
    description: 'Ordered sequence of intermediate waypoints to visit',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  waypoints?: string[];

  @ApiProperty({ type: VehicleProfileDto, description: 'Vehicle restrictions profile' })
  @ValidateNested()
  @Type(() => VehicleProfileDto)
  vehicleProfile: VehicleProfileDto;

  @ApiProperty({
    example: '08:00',
    description: 'Departure time in 24-hour format (HH:mm) to evaluate peak traffic',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'departureTime must be a valid 24-hour format string (HH:mm)',
  })
  departureTime: string;
}