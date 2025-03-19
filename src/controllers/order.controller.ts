import User from '../models/user';
import UserOTPCode from '../models/userotpcode';
import BuyerReview from '../models/buyerreview';
import Product from '../models/product';
import Order from '../models/order';
import Transaction from '../models/transaction';
import sequelize from '../models';
import { Op } from 'sequelize'
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import sendPushNotificationToUser from '../middleware/send-notification'
import handleExpoResponse from '../middleware/handleExpoResponse'
import { Request, Response } from 'express';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});




export const getOrderById = async (req: Request, res: Response) => {

    try {
        let orderData = await Order.findOne({
            where: { id: req.params.orderId },
            include: [
                {
                    model: User,
                    as: 'buyer',
                    attributes: ['id', 'firstName', 'lastName', 'country', 'verifiedUser']
                },
                {
                    model: User,
                    as: 'seller',
                    attributes: ['id', 'firstName', 'lastName', 'country', 'verifiedUser']

                },
                {
                    model: Product,
                    include: [

                        {
                            model: User,
                            attributes: ['id', 'firstName', 'lastName', 'country', 'verifiedUser']
                        },
                        {
                            model: BuyerReview,
                            attributes: ['id', 'comment', 'rating'],
                            required: false
                        }
                    ]
                }
            ]
        })

        res.status(200).json({
            status: "success",
            order: orderData
        })


    }
    catch (err: any) {
        res.status(500).json({ message: err.message })
    }
}


export const getBuyerOrders = async (req: Request, res: Response) => {


    const buyerID: string = req.params.buyerId
    const statusQuery: string = req.query?.orderStatus as string

    let whereClause: any = {
        buyerId: buyerID
    }

    if (statusQuery && statusQuery.trim() !== '') {
        whereClause.status = statusQuery
    }
    try {

        let buyerOrders = await Order.findAndCountAll(
            {
                where: whereClause,
                include: [
                    {
                        model: User,
                        as: 'seller',
                        attributes: ['id', 'firstName', 'lastName', 'country', 'verifiedUser']

                    },
                    {
                        model: Product,
                        include: [

                            {
                                model: User,
                                attributes: ['id', 'firstName', 'lastName', 'country', 'verifiedUser']
                            },
                            {
                                model: BuyerReview,
                                attributes: ['id', 'comment', 'rating'],
                                required: false
                            }
                        ]
                    }
                ]
            }
        )

        res.status(200).json({
            status: "success",
            ordersData: buyerOrders
        })

    }
    catch (err: any) {
        res.status(500).json({ message: err.message })
    }
}


export const getSellerOrders = async (req: Request, res: Response) => {


    let whereClause: any = {
        sellerId: req.params.sellerId
    }

    let prodWhereClause: any = {}
    const statusQuery: string = req.query?.orderStatus as string
    const searchProductName: string = req.query?.productName as string;

    if (statusQuery && statusQuery.trim() !== '') {
        whereClause.status = statusQuery
    }
    if (searchProductName && searchProductName.trim() !== '') {
        prodWhereClause.productName = {
            [Op.like]: `%${searchProductName}%`
        }
    }

    try {

        let sellerOrders = await Order.findAndCountAll(
            {
                where: whereClause,
                include: [
                    {
                        model: User,
                        as: 'buyer',
                        attributes: ['id', 'firstName', 'lastName', 'country', 'verifiedUser']

                    },
                    {
                        model: Product,
                        where: prodWhereClause,
                        include: [

                            {
                                model: User,
                                attributes: ['id', 'firstName', 'lastName', 'country', 'verifiedUser']
                            },
                            {
                                model: BuyerReview,
                                attributes: ['id', 'comment', 'rating'],
                                required: false
                            }
                        ]
                    }
                ]
            }
        )

        res.status(200).json({
            status: "success",
            ordersData: sellerOrders
        })

    }
    catch (err: any) {
        res.status(500).json({ message: err.message })
    }
}




export const createOrder = async (req: any, res: Response) => {

    try {
        var transaction: any = await sequelize.transaction();

        let { amount, shipAddress, weight, sellerId } = req.body

        console.log("\n\n req.body", req.body);

        // Validate the sellerId Before Inserting
        const seller = await User.findOne({ where: { id: sellerId } });
        if (!seller) {
            return res.status(400).json({ message: 'Invalid sellerId: Seller does not exist.' });
        }
        // orderData.buyerId = req.userData.UserId;
        let order = await Order.create({
            amount,
            shipAddress,  // string
            weight,
            sellerId: seller?.id ?? sellerId,
            prodId: req.params.productId,
            // buyerId: req.userData.UserId,
            buyerId: "3ff1ceec-9f0d-4952-9c6c-fe3973dd8fa1",
            status: 'pending',
            dispatched: false
        }, { transaction });


        let chargeTransaction = await Transaction.create({
            amount: order.amount,
            orderId: order.id,
            status: 'pending'
        }, { transaction });

        // commiting the DB transaction
        await transaction.commit();
        // await models.Transaction.create({orderId: order.id})

        res.status(200).json({
            message: 'Order created successfully. Please proceed toward payment else order can not be processed further',
            orderDetails: order
        })
    }
    catch (err: any) {
        console.error("\n\n err: ", err);
        await transaction.rollback();
        res.status(500).json({ message: err.message })
    }
}


export const updateOrder = async (req: any, res: Response) => {
    try {

        let txOrder = await Transaction.findOne({
            where: { orderId: req.params.orderId }
        })

        if (txOrder && txOrder.status !== 'completed') {
            return res.status(403).json(
                {
                    message: "This Order is not in Transaction. Please make payment first"
                }
            )
        }

        if (txOrder?.status === 'completed') {
            await Order.update(
                { status: 'processing' },
                {
                    where: { id: req.params.orderId },
                })
            let orderData = await Order.findByPk(req.params.orderId)
            let sellerId = orderData?.sellerId
            const sellerData = await User.findByPk(sellerId)
            const buyerData = await User.findByPk(req.userData.UserId)

            if (sellerData?.expoPushToken) {
                const messageToSend: any = {
                    title: 'Order Completed',
                    message: `Congratulations! Your Order has been marked as completed`
                }

                // Notify the seller about the new order
                const result = await sendPushNotificationToUser(sellerData.expoPushToken, messageToSend)
                await handleExpoResponse(result, sellerId as string, messageToSend)

            }

            if (buyerData?.expoPushToken) {
                const messageToSend: any = {
                    title: 'Order Completion',
                    message: `You have marked your order as completed`
                }

                // Notify the buyer about the new order
                const result = await sendPushNotificationToUser(buyerData.expoPushToken, messageToSend)
                await handleExpoResponse(result, req.userData.UserId, messageToSend)

            }


            res.status(200).json({ message: "Order Completed Successfully!" })

        }
    }
    catch (err: any) {
        res.status(500).json({ message: err.message })
    }
}

export const getTransaction = async (req: Request, res: Response) => {
    let orderID = req.params.orderId

    try {
        let transaction = await Transaction.findOne({ where: { orderId: orderID } })

        return res.status(200).json(
            {
                message: "Transaction Details",
                details: transaction
            }
        )
    }
    catch (err: any) {
        res.status(500).json(
            {
                message: err.message
            }
        )
    }
}

export const updateDispatchDetails = async (req: Request, res: Response, next: any) => {
    const orderId = req.params.orderId
    let dispatchData = req.body
    let details: any = {
        dispatchedAt: Date.now(),
        method: dispatchData.method
    }


    try {

        var cloudinary_image_uplaod;

        if (req.file) {

            // upload image to the cloudinary
            cloudinary_image_uplaod = await cloudinary.uploader.upload(req.file.path, {
                resource_type: 'image'
            })

            // saving the imagine url of the cloudinary to our db
            details.imageUrl = cloudinary_image_uplaod.secure_url;
            // removing the file from public directory
            fs.unlinkSync(req.file.path)

        }



        const result = await Order.update(
            {
                status: 'dispatched',
                dispatched: true,
                dispatchDetails: JSON.stringify(details),
                deliveryDate: dispatchData.date
            },
            {
                where: { id: orderId }
            }
        )


        res.status(200).json({
            message: "Dispatch details updated successfully"
        })

    } catch (error) {
        next(error)
    }
}