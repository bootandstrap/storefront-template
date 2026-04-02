
import { getConfig } from './src/lib/config';

async function test() {
    try {
        console.log('Fetching config...');
        const config = await getConfig();
        console.log('Config fetched successfully:', config.config.business_name);
    } catch (err) {
        console.error('Error fetching config:', err);
    }
}

test();
