export interface UserAttributes {
     id?: string
     firstName: string;
     lastName: string;
     email: string;
     address: string;
     shipAddress: any;
     country: string;
     imageUrl: string;
     googleId: string;
     facebookId: string;
     phoneNum: number;
     roleId: string,
     password: string | null
     expoPushToken: string | null;
     vip: boolean;
     verifiedUser: boolean;
     createdAt: any;
     updatedAt: any
}

export interface RoleAttributes {
     id?: string
     roleName: string;
}

export interface ProductAttributes {
     id?: string; // UUID
     productName?: string;
     productCat?: string;
     priceType?: string;
     price?: number;
     imageUrl?: string;
     description?: string;
     wholeSale?: boolean;
     userId: string; // UUID
     createdAt: any;
     updatedAt: any
}


export interface BuyerReviewAttributes {
     id?: string;
     comment: string;
     rating: number;
     userId: string;
     prodId: string;
     orderId: string;
     createdAt: any;
     updatedAt: any
}

export interface OrderAttributes {
     id?: string; // UUID
     amount?: number;
     shipAddress?: string;
     weight?: string;
     review?: object | null;
     status: string;
     buyerId: string; // UUID
     sellerId: string; // UUID
     dispatchDetails?: any;
     dispatched: boolean;
     deliveryDate?: Date | null;
     prodId: string; // UUID
     createdAt: any;
     updatedAt: any
}

export interface UserOTPAttributes {
     id?: number;
     userId: string;
     otp: string;
     expiredAt: any;
     createdAt: any;
     updatedAt: any;
}

export interface TransactionAttributes {
     id?: string; // UUID
     amount?: number;
     status: string;
     txType?: string;
     txMethod?: string;
     txDetails?: object | null;
     currency?: string;
     orderId: string; // UUID
     createdAt: any;
     updatedAt: any
}

export interface NotificationAttributes {
     id?: string; // UUID
     title?: string;
     message?: string;
     isRead: boolean;
     userId: string; // UUID
     createdAt: any;
     updatedAt: any
}