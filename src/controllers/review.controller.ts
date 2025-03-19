import  User  from '../models/user';
import  UserOTPCode  from '../models/userotpcode';
import  BuyerReview  from '../models/buyerreview';
import  Product  from '../models/product';
import  Order  from '../models/order';
import  {Op} from 'sequelize'
import { Request, Response } from 'express';
import sendPushNotificationToUser from '../middleware/send-notification';
import handleExpoResponse from '../middleware/handleExpoResponse';


// get review of a product
export const orderReview = async(req: Request,res: Response)=>{

    try{
            let orderReview = await BuyerReview.findOne({where: {orderId: req.params.orderId},
                include: [
                    {
                        model: User,
                        attributes: ['id','firstName','lastName','country', 'verifiedUser']
                    },
                    {
                        model: Product,
                        attributes: ['id','productName','productCat','imageUrl']
                    }

                ]
            })

            res.status(200).json({
                status: "success",
                orderReviewData: orderReview
            })
    }
    catch(err: any)
    {
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}



// get reviews of a product
export const getReviewByProdId = async(req: Request,res: Response) => {
        let whereClause: any = {
            prodId: req.params.productId
        }
        let rating: string = req.query.rating as string
        if(rating  && rating.trim() !== ''){
            // convert rating from string to number
            let ratingNum = Number(rating)
            whereClause.rating = {
                [Op.eq]: ratingNum
            } 
        }
        try{
            // let productId= req.params.productId
            //get the reviews by product id
            const revs = await BuyerReview.findAndCountAll({where: whereClause,
                include: [
                    {
                        model: User,
                        attributes: ['id','firstName','lastName','country',  'verifiedUser']
                    },
                    {
                        model: Product,
                        attributes: ['id','productName','productCat','imageUrl']
                    }

                ]
            })

                res.status(200).json({reviews: revs})

        }
        catch(err: any)
        {
            res.status(500).json({message: err.message})
        }
}


// create a review
export const createReview = async(req: any, res: Response) => {

    let reviewData= req.body

   

    const reviewOrder = {
        rating: req.body.rating,
        comment: req.body.comment
    }
    try{
            reviewData.prodId = req.params.productId;
            reviewData.userId = req.userData.UserId;
            reviewData.orderId = req.params.orderId;
            reviewData.rating = req.body.rating;
            reviewData.comment = req.body.comment;

            let order = await Order.findOne({where: {id: req.params.orderId}})
            if(order?.status === 'delivered')

                {
                    
                    
                    await BuyerReview.create(reviewData);

                    await Order.update({
                        review: reviewOrder
                    },
                    {where: {id: req.params.orderId}})


                    const sellerData = await User.findByPk(order.sellerId)
                        // sending notification

                        if(sellerData?.expoPushToken) 
                            {
                                     const messageToSend: any = {
                                        title: 'Order Reviewed',
                                        message: `You got a review on your order from the buyer`
                                     }
            
                                // Notify the seller about the new order
                                    const result = await sendPushNotificationToUser(sellerData.expoPushToken, messageToSend)
                                    await handleExpoResponse(result, order.sellerId, messageToSend)
                                    
                            }

                    res.status(200).json({message: "Review Added Successfully!"});
                }
            else
                {
                    res.status(401).json({
                        message: "The order is still in processing or pending state. You can not review yet"
                    })
                }

            
    }
    catch(err: any)
    {
        res.status(500).json({"error": err.message})
    }
}


// update a review
export const updateReview = async(req: Request, res: Response) => {
    let reviewUpdates = req.body
    let reviewId = req.params.reviewId
    try{

        await BuyerReview.update(reviewUpdates, {where: {id: reviewId}})
        
        res.status(200).json({message: "review successfully updated!"})

    }
    catch(err: any)
    {
        res.send(500).json({"error": err.message})
    }
}


// remove a review of a user who  is logged in and  owns the review
export const  deleteOwnReview = async (req: any, res: Response)=>{

    let reviewId = req.params.reviewId;
    try{
        const review: any = await BuyerReview.findAll({where:{id: reviewId}, 
            include: [
                {
                    model: User,
                    attributes: ['id','firstName','lastName','country', 'verifiedUser']
                }
            ]})

        if(review?.userId === req.userData.UserId)
        {
            await BuyerReview.destroy({where:{id : reviewId}});
            return res.status(204).json({message: "Review Deleted!"});

        }
        else
        {
            res.status(404).json({message: "You are not owner of that review. You can not do that operation!"})
        }
    }
    catch(err: any)
    {
        res.send(500).json({"error": err.message})
    }
}


module.exports = {
    getReviewByProdId: getReviewByProdId,
    createReview: createReview,
    updateReview: updateReview,
    deleteOwnReview: deleteOwnReview,
    orderReview: orderReview
}