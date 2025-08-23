import { Text } from 'react-native'

const SectionTitle = ({ title, platform }: { 
  title: string, 
  platform: "web" | "mobile" 
}) => {

  if (platform === "web") {
    return (
      <h2 className="text-3xl font-bold mb-6 text-gray-800">{title}</h2>
    )
  }

  return (
    <Text className="text-2xl font-bold mb-4 text-gray-800">{title}</Text>
  )
}

export default SectionTitle