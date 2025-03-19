import * as fs from 'fs';
import User from '../models/user';
import Role from '../models/role';
import UserOTPCode from '../models/userotpcode';
import BuyerReview from '../models/buyerreview';
import Product from '../models/product';
import { v2 as cloudinary } from 'cloudinary';
import { Request, Response } from 'express';


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});


// get all products
export const allProducts = async (req: Request, res: Response) => {
    try {

        let products = await Product.findAndCountAll({
            include: [
                {
                    model: User,
                    attributes: ['id', 'firstName', 'lastName', 'country', 'verifiedUser'],
                    include: [
                        {
                            model: Role
                        }
                    ]
                }
            ]
        });

        res.status(200).json({ products: products })
    }
    catch (err) {
        res.status(500).json({ message: 'Error getting products' })
    }
}

// get a product with a product ID
export const getProduct = async (req: Request, res: Response) => {

    let productId = req.params.productId;
    try {
        let foundProduct = await Product.findOne({
            where: { id: productId }, include: [
                {
                    model: User,
                    attributes: ['id', 'firstName', 'lastName', 'country', 'imageUrl', 'verifiedUser']
                },
                {
                    model: BuyerReview,
                    attributes: ['id', 'comment', 'rating', 'createdAt'],
                    required: false,
                    include: [
                        {
                            model: User,
                            attributes: ['id', 'firstName', 'lastName', 'country', 'imageUrl', 'verifiedUser']
                        }
                    ]

                }
            ]
        });
        res.status(200).json({ product: foundProduct });
    }
    catch (err: any) {
        res.status(500).json({ message: err.message })
    }
}

// get all product of a User

export const userProducts = async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId
        const userProducts = await Product.findAndCountAll({
            where: { userId: userId },
            //  order:[['createdAt', 'DESC']]
        })

        // console.log(userProducts)
        res.status(200).json({ products: userProducts })
    }
    catch (err: any) {
        res.status(500).json({ message: err.message })
    }
}


// add a new product
export const createProduct = async (req: any, res: Response, next: any) => {
    try {
        const productData = { ...req.body, userId: req.userData.UserId };

        if (req.file) {
            const cloudinary_image_uplaod = await cloudinary.uploader.upload(req.file.path, { resource_type: 'image' });
            productData.imageUrl = cloudinary_image_uplaod.secure_url;

            // removing the file from public directory
            fs.unlinkSync(req.file.path);
        }

        const result = await Product.create(productData);

        res.status(200).json({
            message: 'OK',
            product: result
        })
    }
    catch (err) {
        // res.status(500).json({message: err})
        console.log(`\n\n Error: ${err}`);
        next(err)
    }
}

// update a prodcut
export const updateProduct = async (req: Request, res: Response) => {
    let productId = req.params.productId;

    try {
        if (req.file) {
            // req.body.imageUrl = req.file.path;

            // upload image to the cloudinary
            let cloudinary_image_uplaod = await cloudinary.uploader.upload(req.file.path)

            // saving the imagine url of the cloudinary to our db
            req.body.imageUrl = cloudinary_image_uplaod.secure_url;
        }
        let productData = req.body;

        await Product.update(productData, { where: { id: productId } })

        res.status(200).json({ message: 'Updated Successfully' })

    }
    catch (err: any) {
        res.status(500).json({ message: err.message })
    }
}

// delete a product
export const removeProduct = async (req: Request, res: Response) => {
    try {

        await Product.destroy({ where: { id: req.params.productId } })

        res.status(200).json({ message: "Your product has been deleted from the system" })
    }
    catch (err: any) {
        res.status(500).json({ message: err.message })
    }
}
