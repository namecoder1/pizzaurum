import Head from 'expo-router/head'
import React from 'react'

const PrivateLayout = ({ 
  children,
  title,
  description,
  className
}: {
  children: React.ReactNode,
  title: string,
  description: string,
  className?: string
}) => {
  return (
    <>
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
    </Head>
    <section className={`flex flex-col ${className}`}>
        {children}
    </section>
    </>
  )
}

export default PrivateLayout