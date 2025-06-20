import React, { useState, useEffect } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Make sure to put your actual publishable key here,
// ideally from an environment variable.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_YOUR_PUBLISHABLE_KEY');

interface SupportScreenProps {
  onBack: () => void;
}

const CheckoutForm: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [amount, setAmount] = useState(5); // Default donation amount in dollars
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setErrorMessage(null);

        if (!stripe || !elements) {
            setErrorMessage("Stripe has not loaded yet. Please wait a moment.");
            setIsLoading(false);
            return;
        }

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Make sure to change this to your payment completion page
                return_url: `${window.location.origin}`,
            },
        });

        // This point will only be reached if there is an immediate error when
        // confirming the payment. Otherwise, your customer will be redirected to
        // your `return_url`.
        if (error.type === "card_error" || error.type === "validation_error") {
            setErrorMessage(error.message || "An unexpected error occurred.");
        } else {
            setErrorMessage("An unexpected error occurred.");
        }

        setIsLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '500px' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>Choose an amount:</h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '25px' }}>
                {[1, 5, 10, 20].map(val => (
                    <button 
                        key={val} 
                        type="button"
                        onClick={() => setAmount(val)}
                        style={{
                            padding: '10px 20px',
                            fontSize: '16px',
                            cursor: 'pointer',
                            border: amount === val ? '2px solid #0000FF' : '2px solid #ccc',
                            borderRadius: '5px',
                            backgroundColor: amount === val ? '#e0e0ff' : '#fff'
                        }}
                    >
                        ${val}
                    </button>
                ))}
            </div>
            
            <PaymentElement id="payment-element" />

            <button 
                disabled={isLoading || !stripe || !elements} 
                id="submit"
                style={{
                    backgroundColor: '#0000FF',
                    color: 'white',
                    border: 'none',
                    padding: '12px 20px',
                    fontSize: '18px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    width: '100%',
                    marginTop: '20px',
                    opacity: (isLoading || !stripe || !elements) ? 0.5 : 1
                }}
            >
                <span id="button-text">
                    {isLoading ? "Processing..." : `Donate $${amount}`}
                </span>
            </button>
            {errorMessage && <div id="payment-message" style={{color: 'red', marginTop: '10px'}}>{errorMessage}</div>}

             <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); onBack(); }}
                style={{ 
                    display: 'block',
                    textAlign: 'center',
                    marginTop: '20px', 
                    fontSize: '16px', 
                    color: '#0000FF', 
                    textDecoration: 'underline' 
                }}
            >
                Back to Menu
            </a>
        </form>
    );
}

export const SupportScreen: React.FC<SupportScreenProps> = ({ onBack }) => {
    const [clientSecret, setClientSecret] = useState('');
    const [amount, setAmount] = useState(500); // Default amount in cents

    // We need a new useEffect to create a PaymentIntent when the amount changes
    useEffect(() => {
        // Create PaymentIntent as soon as the page loads with a default amount
        fetch('/api/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amount }), // amount is in cents
        })
        .then((res) => res.json())
        .then((data) => {
            if(data.clientSecret) {
                setClientSecret(data.clientSecret)
            } else {
                console.error("Failed to get client secret:", data.error);
            }
        });
    }, [amount]); // Re-run when amount changes

    const appearance = {
        theme: 'stripe',
    };
    const options: StripeElementsOptions = {
        clientSecret,
        appearance,
    };

  return (
    <div style={{
      fontFamily: 'var(--font-inter), Arial, sans-serif',
      color: '#000000',
      backgroundImage: 'url(/images/bbubg2.png)',
      backgroundRepeat: 'repeat',
      width: '100%',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <h1 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '20px' }}>Support the Game</h1>
      <p style={{ fontSize: '18px', marginBottom: '20px', textAlign: 'center' }}>
        Thank you for considering supporting Brick Blast Ultimate! Your contribution helps keep the game running.
      </p>
      
      {clientSecret && (
        <Elements options={options} stripe={stripePromise}>
          <CheckoutForm onBack={onBack}/>
        </Elements>
      )}

    </div>
  );
}; 