

// const swaggerAutogen = require('swagger-autogen')({openapi: '3.0.0'});
import swaggerUi from "swagger-ui-express";
import swaggerJsDoc from "swagger-jsdoc";

// const host = process.env.DB_HOST || 'localhost:3000'

const doc: any = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Food House API",
            version: "1.0.0",
            description: "API Documentation for Food House",
            contact: {
                name: "Food House",
                // url: "https://foodhouse-cm.com",
                // email: "support@foodhouse-cm.com"
            }
        },
        servers: [
            {
                url: "https://api.foodhouse-cm.com/api",
                description: "Production Server Main",
            },
            {
                url: "http://localhost:3000/api",
                description: "Development on Local server",
            },
            {
                url: "https://foodhouse-backend-vo8i.onrender.com/api",
                description: "Development on Render",
            },
        ],
    },
    apis: ["./routes/*.ts"],
};

// const outputFile = './swagger-output.json';
// const routes = ['./routes/index.js'];

/* NOTE: If you are using the express Router, you must pass in the 'routes' only the 
root file where the route starts, such as index.js, app.js, routes.js, etc ... */

// swaggerAutogen(outputFile, routes, doc);
const swaggerSpec = swaggerJsDoc(doc);

export default swaggerSpec;
