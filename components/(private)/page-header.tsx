import React from 'react'

const PageHeader = ({ 
  children,
  showChildren = false,
  title,
  description
}: { 
  children?: React.ReactNode ,
  showChildren?: boolean,
  title: string,
  description: string
}) => {

  if (showChildren) {
    return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-600 mt-2">{description}</p>
      </div>
      {children}
    </div>
    )
  }

  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-600 mt-2">{description}</p>
      </div>
    </div>
  )
}

export default PageHeader