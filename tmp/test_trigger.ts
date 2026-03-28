import { createClient } from '@supabase/supabase-js';

const sUrl = "https://wzpriuuxrnbjkkoiskvw.supabase.co";
const sKey = "sb_publishable_1EIIuYUZagFNHDIkrklBbA_wZp4Io4m";

const supabase = createClient(sUrl, sKey);

async function testStatus() {
  console.log("--- TEST STATUS CHANGE ON PAYMENT ---");
  
  // 1. Create a dummy order
  const { data: order, error } = await supabase.from('orders').insert([{
    customer_name: "Test Bug Hunter",
    status: 'pending',
    payment_status: 'pending',
    items: [],
    total_price: 1.0,
    org_id: '6d6588f6-ccd0-47ec-a0eb-c0a0ef721b70' // Updated real ID
  }]).select().single();

  if (error || !order) {
    console.error("Error creating order:", error);
    process.exit(1);
  }
  
  console.log(`Initial Status: ${order.status}, Payment: ${order.payment_status}`);

  // 2. Perform a PATCH like the server does
  console.log("Updating payment_status to 'paid'...");
  const { data: updated, error: uError } = await supabase.from('orders')
    .update({ payment_status: 'paid' })
    .eq('id', order.id)
    .select()
    .single();

  if (uError || !updated) {
    console.error("Error updating order:", uError);
  } else {
    console.log(`Final Status: ${updated.status}, Payment: ${updated.payment_status}`);
    if (updated.status !== 'pending') {
      console.log(`--- ALERT: STATUS CHANGED TO "${updated.status}" AUTOMATICALLY BY DATABASE TRIGGER! ---`);
    } else {
      console.log("--- CLEAN: Database did not change status automatically. ---");
    }
  }

  // Cleanup
  await supabase.from('orders').delete().eq('id', order.id);
  process.exit(0);
}

testStatus();
