class WorkflowEngine:
    """Moteur de gestion des processus (BPM léger)"""
    
    # Définition des transitions autorisées (State Machine)
    ORDER_WORKFLOW = {
        'pending': ['paid', 'cancelled'],
        'paid': ['shipped', 'refunded'],
        'shipped': ['delivered'],
        'delivered': [],
        'cancelled': [],
        'refunded': []
    }

    def can_transition(self, current_status, new_status):
        """Vérifie si un changement d'état est autorisé"""
        allowed = self.ORDER_WORKFLOW.get(current_status, [])
        return new_status in allowed

    def process_order_update(self, order, new_status):
        """Applique une logique métier lors d'un changement d'état"""
        if not self.can_transition(order.status, new_status):
            return False, f"Transition impossible de {order.status} à {new_status}"
        
        # Logique métier spécifique
        if new_status == 'paid':
            # Ajoutez ici vos emails ou autres notifications
            pass
            
        order.status = new_status
        return True, "Succès"