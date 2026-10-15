export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css', '~/assets/css/enhancements.css', '~/assets/css/admin.css', '~/assets/css/nordic.css', '~/assets/css/storefront-v2.css', '~/assets/css/shopping-v2.css', '~/assets/css/customer-phase3.css', '~/assets/css/operations-phase4.css', '~/assets/css/integration-phase6.css', '~/assets/css/support-center.css', '~/assets/css/about-story.css', '~/assets/css/release-gate.css', '~/assets/css/premium-discovery.css', '~/assets/css/accessibility.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'sv' },
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Nunito:wght@800;900;1000&display=swap' }
      ],
      titleTemplate: '%s · Norrli Pets',
      meta: [
        { name: 'description', content: 'Scandinavian pet essentials for cleaner homes, safer trips and happier pets.' },
        { name: 'theme-color', content: '#f7f5ef' }
      ]
    }
  },
  runtimeConfig: {
    supabaseSecretKey: '',
    mollieApiKey: '',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    brevoApiKey: '',
    brevoSenderEmail: '',
    brevoSenderName: 'Norrli Pets',
    brevoListId: '',
    checkoutEnabled: false,
    public: {
      supabaseUrl: '',
      supabasePublishableKey: '',
      siteUrl: 'http://localhost:3000',
      checkoutEnabled: false
    }
  },
  nitro: {
    preset: 'vercel'
  }
})
