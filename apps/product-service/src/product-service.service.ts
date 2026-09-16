import { Injectable } from '@nestjs/common';
import {PrismaClient} from "@prisma/client/extension";
import {PrismaService} from "./prisma.service.js";

@Injectable()
export class ProductServiceService {
  constructor(private readonly client: PrismaService) {
  }

  createProduct(
      product: {
        name: string,
        price: number,
      }
  ) {
    return this.client.$transaction(async (tx) => {
        const created = await tx.product.create({
            data: {
                name: product.name,
                price: product.price,
            }
        });

        await tx.outboxEvent.create({
            data: {
                eventType: 'product.created',
                payload: {
                    id: created.id,
                    name: created.name,
                    price: created.price,
                }
            }
        })

        return created
    })
  }
}
