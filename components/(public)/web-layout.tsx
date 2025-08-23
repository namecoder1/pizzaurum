import React from "react";
import Footer from "./footer";
import Navbar from "./navbar";
import Head from 'expo-router/head'
import { OpenDaysProps } from "@/types/types";

const WebLayout = ({ 
  children, 
  title, 
  description, 
  className, 
  openDays, 
  openDaysLoading 
}: { 
  children: React.ReactNode, 
  title: string, 
  description: string, 
  className?: string, 
  openDays?: OpenDaysProps[], 
  openDaysLoading?: boolean 
}) => {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Head>
      <section className=" flex flex-col">
        <Navbar />
        <div className={`bg-gray-50 min-h-screen ${className}`}>
          {children}
        <Footer openDays={openDays || []} openDaysLoading={openDaysLoading || false} />
        </div>
      </section>
    </>
  );
};

export default WebLayout;
