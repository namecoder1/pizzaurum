import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet'
import React from 'react'

interface CustomBottomSheetProps {
  bottomSheetRef: React.RefObject<BottomSheetModal | null>
  snapPoints: string[]
  renderBackdrop: (props: any) => React.ReactNode
  children: React.ReactNode
  index: number
  onChange?: (index: number) => void
  onDismiss?: () => void
  enableOverDrag?: boolean
  enableContentPanningGesture?: boolean
}

const CustomBottomSheet = ({
  bottomSheetRef,
  snapPoints,
  renderBackdrop,
  children,
  index,
  onChange,
  onDismiss,
  enableOverDrag = false,
  enableContentPanningGesture = true,
}: CustomBottomSheetProps) => {
  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={index}
      snapPoints={snapPoints}
      onChange={onChange}
      onDismiss={onDismiss}
      enablePanDownToClose={true}
      enableDismissOnClose={true} 
      enableOverDrag={enableOverDrag}
      enableContentPanningGesture={enableContentPanningGesture}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        alignItems: "flex-start",
        justifyContent: "flex-start",
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
      }}  
      handleIndicatorStyle={{ backgroundColor: '#9ca3af' }}
    >
      <BottomSheetScrollView>
        {children}
      </BottomSheetScrollView>
    </BottomSheetModal>
  )
}

export default CustomBottomSheet