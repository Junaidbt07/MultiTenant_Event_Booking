// src/app/(frontend)/page.tsx
import { headers as getHeaders } from 'next/headers.js'
import Image from 'next/image'
import { getPayload } from 'payload'
import React from 'react'
import { fileURLToPath } from 'url'
import config from '@/payload.config'
import './styles.css'

export default async function HomePage() {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })
  
  return (
    <div className="home">
      <div className="content">
        <picture>
          <source srcSet="https://raw.githubusercontent.com/payloadcms/payload/main/packages/ui/src/assets/payload-favicon.svg" />
          <Image
            alt="Payload Logo"
            height={65}
            src="https://raw.githubusercontent.com/payloadcms/payload/main/packages/ui/src/assets/payload-favicon.svg"
            width={65}
          />
        </picture>
        
        {!user && <h1>Welcome to your new project.</h1>}
        {user && <h1>Welcome back, {user.email}</h1>}
        
        {user && (
          <div className="user-info">
            <p>Role: <strong>{user.role}</strong></p>
            <p>Tenant: <strong>{typeof user.tenant === 'object' ? user.tenant.name : 'Unknown'}</strong></p>
          </div>
        )}
        
        <div className="links">
          <a
            className="admin"
            href={payloadConfig.routes.admin}
            rel="noopener noreferrer"
            target="_blank"
          >
            Go to admin panel
          </a>
          
          {user?.role === 'organizer' && (
            <a
              className="dashboard"
              href="/dashboard"
              rel="noopener noreferrer"
            >
              Organizer Dashboard
            </a>
          )}
          
        </div>
      </div>
      
    </div>
  )
}