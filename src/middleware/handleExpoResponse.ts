import  Notification from '../models/notifiation'; // Adjust imports based on your project structure
import  User  from '../models/user';


interface ExpoResponse {
  status: 'ok' | 'error';
  details?: {
    error?: string;
  };
}

interface MessageToSend {
  title: string;
  message: string;
}

const expoNotificationResponse = async (
  result: ExpoResponse,
  userId: string,
  messageToSend: MessageToSend
): Promise<void> => {
  if (result.status === 'ok') {
    await Notification.create({
      userId: userId,
      title: messageToSend.title,
      message: messageToSend.message,
      isRead: false
    });
    return;
  }

  if (result.status === 'error') {
    if (result.details && result.details.error === 'DeviceNotRegistered') {
      // This means the push token is invalid (e.g., app was uninstalled)
      // Remove or invalidate the push token from your database
      await User.update({ expoPushToken: null }, { where: { id: userId } });
      return;
    } else {
      return;
    }
  }
};

export default expoNotificationResponse;
