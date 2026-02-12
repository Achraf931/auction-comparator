<script setup lang="ts">
const config = useRuntimeConfig();
</script>

<template>
  <div class="prose dark:prose-invert max-w-none">
    <h1>Terms of Service</h1>
    <p class="text-zinc-500">Last updated: {{ new Date().toLocaleDateString() }}</p>

    <h2>Acceptance of Terms</h2>
    <p>
      By using {{ config.public.appName }}, you agree to these Terms of Service.
      If you do not agree, please do not use our service.
    </p>

    <h2>Description of Service</h2>
    <p>
      {{ config.public.appName }} provides a browser extension that compares auction prices
      with market prices from various online sources. The service operates on a pay-as-you-go
      credit system.
    </p>

    <h2>User Accounts</h2>
    <p>
      You are responsible for maintaining the confidentiality of your account credentials.
      You agree to notify us immediately of any unauthorized use of your account.
    </p>

    <h2>Credits and Payment</h2>
    <ul>
      <li>Credits are purchased as one-time payments</li>
      <li>Credits never expire once purchased</li>
      <li>Each new price comparison consumes 1 credit</li>
      <li>Cached results (recent lookups) are free</li>
      <li>Refunds are handled on a case-by-case basis</li>
      <li>We reserve the right to change prices with 30 days notice</li>
    </ul>

    <h2>Acceptable Use</h2>
    <p>You agree not to:</p>
    <ul>
      <li>Use the service for any illegal purpose</li>
      <li>Attempt to reverse engineer or hack our systems</li>
      <li>Share your account with others</li>
      <li>Use automated tools to access the service excessively</li>
    </ul>

    <h2>Disclaimer</h2>
    <p>
      Price comparisons are provided for informational purposes only. We do not guarantee
      the accuracy of price data or availability of products. You should always verify
      prices before making purchasing decisions.
    </p>

    <h2>Limitation of Liability</h2>
    <p>
      To the maximum extent permitted by law, we shall not be liable for any indirect,
      incidental, special, consequential, or punitive damages resulting from your use
      of the service.
    </p>

    <h2>Changes to Terms</h2>
    <p>
      We may update these terms from time to time. We will notify you of significant
      changes via email or through the service.
    </p>

    <h2>Contact Us</h2>
    <p>
      If you have questions about these Terms, please contact us at
      <a href="mailto:contact@auctimatch.com">contact@auctimatch.com</a>.
    </p>
  </div>
</template>
