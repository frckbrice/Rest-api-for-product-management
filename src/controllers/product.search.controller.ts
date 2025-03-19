import User from '../models/user';
import UserOTPCode from '../models/userotpcode';
import BuyerReview from '../models/buyerreview';
import Product from '../models/product';
import { Op } from 'sequelize'
import { Request, Response } from 'express';


export const getAllProductSearch = async (req: Request, res: Response) => {

    const searchProductName = req.query.productName as string;
    const searchProductCat = req.query.productCat || "All";
    const searchProductPriceMin = parseInt(req.query.minPrice as string)
    const searchProductPriceMax = parseInt(req.query.maxPrice as string)
    const searchProductRating = parseInt(req.query.productRating as string) || 5;
    const wholeSale = req.query.wholeSale || false

    console.log("\n\n inside search route: ",
        searchProductName, searchProductCat, searchProductPriceMin, searchProductPriceMax, searchProductRating, wholeSale)

    const { page = '1', limit = '10' } = req.query

    const offset: number = (parseInt(page as string) - 1) * parseInt(limit as string)
    let whereClause: any = {}
    // building where clause based on the req query
    // if(searchProductName && searchProductName.trim() !=='')
    if (searchProductName?.trim()) {
        whereClause.productName = {
            [Op.like]: `%${searchProductName}%`
        }
    }
    if (searchProductCat && searchProductCat !== 'All') {
        whereClause.productCat = { [Op.like]: `%${searchProductCat}%` }
    }

    if (!isNaN(searchProductPriceMin) &&
        !isNaN(searchProductPriceMax)) {
        whereClause.price = { [Op.between]: [searchProductPriceMin, searchProductPriceMax] }
    }

    if (wholeSale) {
        whereClause.wholeSale = true
    }

    try {
        let result = await Product.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit as string),
            offset: offset,
            include: [
                {
                    model: User,
                    attributes: ['id', 'firstName', 'lastName', 'country', 'verifiedUser'],
                    // include: [
                    //     {
                    //         model: models.Role
                    //     }
                    // ]
                },
                {
                    model: BuyerReview,
                    attributes: ['id', 'comment', 'rating'],
                    where: {
                        rating: searchProductRating
                    },
                    include: [
                        {
                            model: User,
                            attributes: ['id', 'firstName', 'lastName', 'country', 'verifiedUser'],
                            // include: [
                            //     {
                            //         model: models.Role
                            //     }
                            // ]
                        }
                    ],
                    required: false

                }
            ]
            // {
            //     productName:{
            //         [Op.iLike]: `%${searchProductName}%`
            //     },
            //     productCat: searchProductCat !== 'All' ? searchProductCat: {[Op.ne]:null}

            // }
        })

        res.status(200).json({
            queryResult: result
        })
    }
    catch (err: any) {
        console.log("\n\n Error: ", err);
        res.status(500).json({ message: err.message })
    }

}

