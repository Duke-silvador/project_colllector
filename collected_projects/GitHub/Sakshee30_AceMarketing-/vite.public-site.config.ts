import {defineConfig,loadEnv} from 'vite'
import react from '@vitejs/plugin-react'

const routes=['/','/pricing','/demo','/company','/resources','/case-studies','/privacy','/terms','/security','/solutions','/industries','/agents','/integrations']

export default defineConfig(({mode})=>{
  const env=loadEnv(mode,process.cwd(),'')
  const origin=String(env.PUBLIC_SITE_ORIGIN||env.VITE_PUBLIC_SITE_ORIGIN||'http://localhost:4174').replace(/\/$/,'')
  return {
    root:'website/public-site',
    plugins:[
      react(),
      {
        name:'ace-public-seo-assets',
        generateBundle(){
          const urls=routes.map(path=>`  <url><loc>${origin}${path}</loc></url>`).join('\n')
          this.emitFile({type:'asset',fileName:'sitemap.xml',source:`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`})
          this.emitFile({type:'asset',fileName:'robots.txt',source:`User-agent: *\nAllow: /\nDisallow: /preview/\nSitemap: ${origin}/sitemap.xml\n`})
          this.emitFile({type:'asset',fileName:'route-policy.json',source:JSON.stringify({generatedAt:new Date().toISOString(),routes:routes.map(path=>({path,cache:path==='/demo'?'dynamic':'public-cacheable'}))},null,2)})
        }
      }
    ],
    build:{outDir:'../../dist/public-site',emptyOutDir:true,manifest:true},
    server:{port:5175,host:true,proxy:{'/api':{target:'http://127.0.0.1:3001',changeOrigin:true}}},
    preview:{port:4175,host:true}
  }
})
