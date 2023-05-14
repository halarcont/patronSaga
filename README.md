# Pasos para compilar el proyecto

1- Instale los paquetes NPM.  
    >npm install  
    
2- En la carpeta raíz, ejecute el siguiente comando para indicar al TypeScript transpilador que cree todos los JavaScript archivos necesarios:  
    >npm run build  
    
3- Implemente el paquete de demostración en AWS.  
    >cdk bootstrap  
    >cdk deploy  
    
4- Limpiar recursos:  
    >cdk destroy
