import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { View, Text, Modal, StyleSheet, Button, TouchableOpacity } from 'react-native';
import React, { useRef, useState } from 'react';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export interface ModalCameraProps {
    isVisible: boolean;
    onClose: () => void;
    onSave: (photo: any) => void;
}

export default function ModalCamera({
    isVisible,
    onClose,
    onSave,
}: ModalCameraProps) {
    const [facing, setFacing] = useState<CameraType>('back');
    const cameraRef = useRef<any>()
    const [permission, requestPermission] = useCameraPermissions();

    const handleTakePhoto = async () => {
        const photo = await cameraRef.current?.takePictureAsync({
            quality: 0.5,
            base64: true,
        });

        if (photo) {
            onSave(photo);
            onClose();
        }
    };

    const handlePickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            base64: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            onSave(result.assets[0]);
            onClose();
        }
    };

    return (
        <Modal visible={isVisible} onDismiss={onClose}>
            {!permission ? (
                <View />
            ) : !permission.granted ? (
                <View style={styles.container}>
                    <Text style={styles.message}>Necesitas activar los permisos</Text>
                    <Button onPress={requestPermission} title="Conceder permiso" />
                </View>
            ) : (
                <View style={styles.container}>
                    <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={styles.button}
                                onPress={() => setFacing(prev => (prev === 'front' ? 'back' : 'front'))}
                            >
                                <Ionicons name="refresh-circle" size={50} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.button} onPress={handleTakePhoto}>
                                <MaterialCommunityIcons name="circle-slice-8" size={75} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.button} onPress={handlePickImage}>
                                <MaterialIcons name="cloud-circle" size={50} color="white" />
                            </TouchableOpacity>
                        </View>
                    </CameraView>
                </View>
            )}
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    message: {
        textAlign: 'center',
        paddingBottom: 10,
    },
    camera: {
        flex: 1,
    },
    buttonContainer: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: 'transparent',
        margin: 64,
    },
    button: {
        flex: 1,
        alignSelf: 'flex-end',
        alignItems: 'center',
    },
});


