module.exports = function configureServer(app) {
    // Set view engine if using templates
    app.set('view engine', 'html');
    
    // Additional server configurations can be added here
    console.log('Server configuration loaded');
    
    return app;
};