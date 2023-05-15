# Pasos para compilar el proyecto

1- En la carpeta raiz del proyecto instale los paquetes NPM.  
    >npm install  
    
2- En la carpeta raíz, ejecute el siguiente comando para indicar al TypeScript transpilador que cree todos los JavaScript archivos necesarios:  
    >npm run build  
    
3- Implemente el paquete de demostración en AWS.  
    >cdk bootstrap  
    >cdk deploy  
    
4- Limpiar recursos:  
    >cdk destroy  

# Input a poner en el state machine
input = {  
        "trip_id": "tripID",  
        "depart_city": "Detroit",  
        "depart_time": "2021-07-07T06:00:00.000Z",  
        "arrive_city": "Frankfurt",  
        "arrive_time": "2021-07-09T08:00:00.000Z",  
        "rental": "BMW",  
        "rental_from": "2021-07-09T00:00:00.000Z",  
        "rental_to": "2021-07-17T00:00:00.000Z",  
        "run_type": runType  
    };
