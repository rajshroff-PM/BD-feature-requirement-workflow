import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Admin client — uses built-in SUPABASE_SERVICE_ROLE_KEY (auto-injected by Supabase)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { persistSession: false } }
        )

        // Verify the caller's JWT
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error("Missing Authorization header")
        const token = authHeader.replace('Bearer ', '')

        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
        if (authError || !user) throw new Error(`Unauthorized: ${authError?.message}`)

        // Check the caller has an admin role
        const { data: callerProfile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profileError) throw new Error(`Profile lookup failed: ${profileError.message}`)
        if (!['SUPER_ADMIN', 'PM', 'MANAGEMENT'].includes(callerProfile?.role)) {
            throw new Error(`Access denied. Your role is: ${callerProfile?.role}`)
        }

        // Parse the new user's details from request body
        const { email, fullName, role } = await req.json()
        if (!email || !fullName || !role) throw new Error("email, fullName and role are required")

        // Create the auth user silently — no email sent
        // email_confirm: true pre-confirms the email so Google OAuth link works immediately
        const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            email_confirm: true,
            user_metadata: {
                full_name: fullName,
                role: role
            }
        })

        if (createError) {
            // If user already exists, just update their profile role
            if (createError.message?.toLowerCase().includes('already') || createError.status === 422) {
                const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
                const existing = existingUsers?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
                if (existing) {
                    await supabaseAdmin.from('profiles').upsert({
                        id: existing.id,
                        email: email,
                        full_name: fullName,
                        role: role
                    }, { onConflict: 'id' })
                    return new Response(JSON.stringify({ success: true, message: 'Existing user role updated to ' + role }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 200,
                    })
                }
            }
            throw new Error(`Failed to create user: ${createError.message}`)
        }

        // Pre-create the profile row (DB trigger also does this, but upsert is safer)
        const { error: profileInsertError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: newAuthUser.user.id,
                email: email,
                full_name: fullName,
                role: role
            }, { onConflict: 'id' })

        if (profileInsertError) {
            console.warn("Profile upsert failed (non-fatal):", profileInsertError.message)
        }

        return new Response(JSON.stringify({
            success: true,
            message: `User ${fullName} (${email}) created with role ${role}. They can now sign in with Google.`
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error("onboard_user error:", error)
        return new Response(JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error"
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
