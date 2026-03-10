import RazorpayCheckout from 'react-native-razorpay';

const startPayment = (options) => {
  return new Promise((resolve, reject) => {
    RazorpayCheckout.open(options)
      .then((data) => {
        resolve(data);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

export { startPayment };
