module.exports = {
    apps: [{
        name: "BLD Server",
        script: "./app.js",
        env: {
            CONFIG: "/config/config.yml",
            NODE_ENV: "development"
        },
        env_production: {
            CONFIG: "/config/prod/config.yml",
            NODE_ENV: "production",
        }
    }]
}