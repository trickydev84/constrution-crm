import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Material, MaterialSchema } from './material.schema';
import { MaterialRequest, MaterialRequestSchema } from './material-request.schema';
import { MaterialsService } from './materials.service';
import { MaterialRequestsService } from './material-requests.service';
import { MaterialsController } from './materials.controller';
import { MaterialRequestsController } from './material-requests.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Material.name, schema: MaterialSchema },
      { name: MaterialRequest.name, schema: MaterialRequestSchema },
    ]),
  ],
  providers: [MaterialsService, MaterialRequestsService],
  controllers: [MaterialsController, MaterialRequestsController],
  exports: [MaterialsService, MaterialRequestsService],
})
export class MaterialsModule {}
