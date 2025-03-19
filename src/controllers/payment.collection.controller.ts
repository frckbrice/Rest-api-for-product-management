import  User  from '../models/user';
import  UserOTPCode  from '../models/userotpcode';
import  BuyerReview  from '../models/buyerreview';
import  Product  from '../models/product';
import  Order  from '../models/order';
import  Transaction  from '../models/transaction';
import axios from 'axios';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {hashSync, compare} from 'bcryptjs'
import  sequelize  from '../models';
import sendPushNotificationToUser from '../middleware/send-notification'
import handleExpoResponse from '../middleware/handleExpoResponse'

// payment gateway adwapay

const MERCHANT_KEY =       process.env.ADWA_MERCHANT_KEY
const APPLICATION_KEY  =   process.env.ADWA_APPLICATION_KEY 
const SUBSCRIPTION_KEY =   process.env.ADWA_SUBSCRIPTION_KEY

const BaseURL_Adwa = process.env.ADWA_BASE_URL

// 1-getitng auth token
 const getAuthToken = async()=>{
    try{
        let data = JSON.stringify({
            "application": APPLICATION_KEY
          });
        let config = {
            method: 'post',
            url: `${BaseURL_Adwa}/getADPToken`,
            headers: { 
              'Content-Type': 'application/json', 
              'Authorization': `Basic ${Buffer.from(MERCHANT_KEY + ':' + SUBSCRIPTION_KEY).toString('base64')}`,
          },
          data : data
        }

        let response = await axios(config)

        return response.data
    }
    catch(err: any )
    {
        console.log(err)
    }
}

// 2- Payment initiation

const paymentCollectRequest = async(data:any, token: string)=>{

    try{
        let config = {
            method: 'post',
            url: `${BaseURL_Adwa}/requestToPay`,
            headers: { 
                'AUTH-API-TOKEN': `Bearer ${token}`, 
                'AUTH-API-SUBSCRIPTION': SUBSCRIPTION_KEY,
                'Content-Type': 'application/json'
          },
          data: JSON.stringify(data)
        }

        let response = await axios(config)
        return response.data
    }
    catch(err: any)
    {
        console.log(err.message)
    }
}


export const mobilePaymentCollection= async(req: Request,res: Response)=>{

        var paymentData = req.body
        // console.log("payment data is: ", paymentData)
        let orderId = req.params.orderId

        const transaction = await sequelize.transaction()
    try{

        const order = await Order.findByPk(orderId);
        if (!order) return res.status(404).json({ error: 'Order not found or not created' });

        let userToken = await getAuthToken()

        if(userToken.data.tokenCode)
            {
                // requesting a payment initiation

                paymentData.orderNumber = `order_${orderId}_${Date.now()}`

                let paymentRequest = await paymentCollectRequest(paymentData, userToken.data.tokenCode)

                if(paymentData.meanCode === 'MASTERCARD' || paymentData.meanCode === 'VISA')
                    {
                        return res.json({message: paymentRequest.data})
                    }
                // var paymentStatus = {}

                 setTimeout(async()=>{
                    let resOutput = await chargeStatusCheck(paymentRequest.data.adpFootprint,paymentData.meanCode, userToken.data.tokenCode)
                    // paymentStatus = resOutput.data
                    if(resOutput.data.status === 'T')
                        {
                            await Transaction.update({
                                amount: parseFloat(paymentData.amount),
                                status: 'completed',
                                txMethod: paymentData.meanCode,
                                currency: paymentData.currency,
                                orderId: orderId, 
                                txDetails: resOutput.data
                            }, {where: {orderId: orderId}, transaction})

                            await transaction.commit()


                            return res.status(200).json({
                                status: "success",
                                message: resOutput.data
                            })

                        }
                        else
                        {
                            return res.json({response: resOutput,
                                message: "Payment was not successfully processed from the end-user."
                            })
                        }
                    
                 },100000)


            }
        else
        {
            return res.status(403).json({
                message: "unable to get the token from the payment service providers. Please try again"
            })
        }

    }
    catch(err: any)
    {
        await transaction.rollback()
        res.status(500).json({
            message: err.message
        })
    }
}


// webhook for adwapay

// manual status check
 const chargeStatusCheck = async(footPrint: string, meanCode: string, token: string)=>{
    let data = JSON.stringify({
        "adpFootprint": footPrint,
        "meanCode": meanCode
      });
      let config = {
        method: 'post',
        url: `${BaseURL_Adwa}/paymentStatus`,
        headers: { 
          'AUTH-API-TOKEN': `Bearer ${token}`, 
          'AUTH-API-SUBSCRIPTION': SUBSCRIPTION_KEY, 
          'Content-Type': 'application/json'
        },
        data : data
      };
    
      try{
            let response = await axios(config)
            return response.data
      }
      catch(err: any)
      {
        console.log("error is status check ", err.message)
      }
}


export const collectionResponseAdwa = async(req: Request,res: Response)=>{
    // console.log("from the adwapay",req.body)

        // res.status(200).json({message: "OK"})
        // let io = req.app.get('socketio');  // Access the io instance

        // console.log("io instance is: ", io)
        const {status, footPrint, orderNumber, moyenPaiement,amount}= req.body
        const transaction = await sequelize.transaction()
    try{
        if (status === 'T')
            {
                // const orderCode = orderNumber.split('-')
                // recheck the payment status
                // 1-get auth token
                let authToken = await getAuthToken()
                if(authToken.data.tokenCode){
                    let checkResponse = await chargeStatusCheck(footPrint,moyenPaiement, authToken.data.tokenCode)
                    // console.log("check response", checkResponse.data)

                    if(checkResponse.data.status === 'T')
                    {
                        let order: any = await Order.findByPk(orderNumber)

                        const sellerData = await User.findByPk(order.sellerId)
                        const buyerData = await User.findByPk(order.buyerId)
                        // console.log("order is: ", order)

                         await Transaction.update({
                            amount: amount,
                            status: 'completed',
                            txMethod: moyenPaiement,
                            txDetails: checkResponse.data
                        }, {where: {orderId: order.id}, transaction})

                        await Order.update({
                            status: 'processing'
                        },{
                            where: {id: order.id }
                        , transaction})

                        // sending notification

                        if(sellerData?.expoPushToken) 
                            {
                                     const messageToSend: any = {
                                        title: 'New Order',
                                        message: `Congratulations! You have received a New Order.`
                                     }
            
                                // Notify the seller about the new order
                                    const result = await sendPushNotificationToUser(sellerData.expoPushToken, messageToSend)
                                    await handleExpoResponse(result, order.sellerId, messageToSend)
                                    
                            }
                            
                            if(buyerData?.expoPushToken) 
                                {
                                         const messageToSend:any = {
                                             title: 'Payment Done',
                                             message: `Your Payment has been Succesfully Made and Your order has started`
                                         }
                
                                    // Notify the buyer about the new order
                                        const result = await sendPushNotificationToUser(buyerData.expoPushToken, messageToSend)
                                        await handleExpoResponse(result, order.buyerId, messageToSend)
                                        
                                }
                    }
                    
                    await transaction.commit()

                    // Emit the event to notify the frontend of the order status
                    // await io.emit('orderStatus', { ok: true });
                    return res.status(200)
                }

            }

    }
    catch(err:any)
    {
        await transaction.rollback()
        return res.status(500).json({message: "Internal Server Error"})
    }
}
