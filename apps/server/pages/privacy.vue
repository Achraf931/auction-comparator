<script setup lang="ts">
const config = useRuntimeConfig();
</script>

<template>
  <div class="prose dark:prose-invert max-w-none">
    <h1>Privacy Policy</h1>
    <p class="text-zinc-500">Last updated: {{ new Date().toLocaleDateString() }}</p>

    <h2>Introduction</h2>
    <p>
      {{ config.public.appName }} ("we", "our", or "us") is committed to protecting your privacy.
      This Privacy Policy explains how we collect, use, and share information about you when you use our
      browser extension and web services.
    </p>

    <h2>Information We Collect</h2>
    <h3>Account Information</h3>
    <p>
      When you create an account, we collect your email address and a hashed version of your password.
      We never store your password in plain text.
    </p>

    <h3>Usage Information</h3>
    <p>
      When you use our extension, we process:
    </p>
    <ul>
      <li>Product titles and prices from auction pages you visit</li>
      <li>Search queries sent to compare prices</li>
      <li>Timestamps and usage patterns for rate limiting</li>
    </ul>

    <h3>Payment Information</h3>
    <p>
      Payment processing is handled by Stripe. We do not store your credit card information.
      We only store your Stripe customer ID to process credit purchases.
    </p>

    <h2>How We Use Information</h2>
    <p>We use the information we collect to:</p>
    <ul>
      <li>Provide and improve our price comparison service</li>
      <li>Process credit purchases</li>
      <li>Send important service updates</li>
      <li>Prevent abuse and enforce our terms of service</li>
    </ul>

    <h2>Data Retention</h2>
    <p>
      We retain your account information as long as your account is active.
      Comparison queries are cached temporarily (up to 1 hour) to improve performance.
      You can request deletion of your data by contacting us.
    </p>

    <h2>Contact Us</h2>
    <p>
      If you have questions about this Privacy Policy, please contact us at charfehamrouni@gmail.com.
    </p>
  </div>
</template>
