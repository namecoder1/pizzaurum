import { config } from '@/utils/config';
import { StripeProvider } from '@stripe/stripe-react-native';
import * as Linking from 'expo-linking';
import { useMemo } from 'react';

// Prefer the central config to select the right key across variants
const publishableKey = config.stripe.publishableKey;

// Merchant identifier for Apple Pay - you can set this as an environment variable
const merchantId = process.env.EXPO_PUBLIC_STRIPE_MERCHANT_ID || 'merchant.pizzaurum.com';

export default function ExpoStripeProvider(
	props: Omit<
		React.ComponentProps<typeof StripeProvider>,
		'publishableKey' | 'merchantIdentifier'
	>
) {
	const urlScheme = useMemo(() => 
		Linking.createURL('/').split(':')[0], 
		[]
	);

	// If no publishable key is configured, avoid initializing Stripe to prevent native crashes
	if (!publishableKey || !publishableKey.startsWith('pk_')) {
		return <>{props.children}</>;
	}

	return (
		<StripeProvider
			publishableKey={publishableKey}
			merchantIdentifier={merchantId}
			urlScheme={urlScheme}
			{...props}
		/>
	)
}