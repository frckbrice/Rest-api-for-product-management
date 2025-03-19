import  Notification   from "../models/notifiation"
import  User  from "../models/user"
import { Request, Response } from 'express';

export const getNotification = async(req:Request,res:Response,next:any)=>{

    const userId = req.params.userId

    try {
            const allNotifications = await Notification.findAndCountAll({where: {userId: userId},
            order: [['createdAt', 'DESC']],
            include: {
                model: User,
                attributes: ['id','firstName','lastName','country', 'verifiedUser']

            }
            })
            res.status(200).json({
                notifiations: allNotifications
            })
    } catch (error) {

        next(error)
        
    }
}


export const createNotification = async(req: Request,res: Response,next:any)=>{

    const userId = req.params.userId
    const { title, message } = req.body;


    try {
        const notification = await Notification.create(
            {userId, message, title, isRead: false}
        )

        res.status(200).json({
            result: notification
        })
                    
    } catch (error) {
        next(error)
        
    }
}


export const markAsRead = async(req:any,res:any,next:any)=>{

    const notificcationId = req.params.id

    try {

        await Notification.update(
            {isRead: true} ,
            {where: {id: notificcationId}}
        )

        res.status(200).json({
            message: "success"
        })
    } catch (error) {
        next(error)
        
    }
}

export const testExpoNotification = async(req:any,res:any,next:any) =>{
    const userID  = req.params.userId
    try {
        const userData: any = await User.findOne({where: {id: userID}})
        if(userData.expoPushToken)
        {
            const message = {
                to: userData.expoPushToken,
                sound: 'default',
                title: "Test Notification",
                body: "a test notification"
              };
            
              const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(message),
              });
              const result = await response.json(); // The response from Expo

            res.status(200).json({
                message: result
            })
        }
        
    } catch (error) {
        next(error)
    }
}

