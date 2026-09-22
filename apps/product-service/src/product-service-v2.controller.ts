import {Controller, Get, Param} from '@nestjs/common';

@Controller({
    path: 'products',
    version: '2',
})
export class ProductServiceV2Controller {
    @Get(':id')
    async getProduct(@Param('id') id: number) {
        return {
            version: 'v2',
            product: {
                id,
                name: "MacBook Pro",
                price: 1999.99,
                currency: "USD"
            },
            metadata: {
                source: 'Product Service',
                apiVersion: 'v2',
            }
        }
    }
}
